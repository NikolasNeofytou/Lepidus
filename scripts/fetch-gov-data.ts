import { XMLParser } from 'fast-xml-parser';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GOV_API_SUBMIT = 'https://aztest.cyprus.gov.cy/gg/submission';
const GOV_API_POLL = 'https://aztest.cyprus.gov.cy/gg/poll';

// Fuel type mapping: Gov API PetroleumType → our internal fuel_type
const FUEL_TYPES: Record<number, string> = {
  1: 'unleaded95',
  2: 'unleaded98',
  3: 'diesel',
  // 4: heating oil — skip
  5: 'kerosene',
};

// Greek city → English district
const CITY_MAP: Record<string, string> = {
  'ΛΕΥΚΩΣΙΑ': 'Nicosia',
  'ΛΕΜΕΣΟΣ': 'Limassol',
  'ΛΑΡΝΑΚΑ': 'Larnaca',
  'ΛΑΡΝΑΚΑ ': 'Larnaca',
  'ΠΑΦΟΣ': 'Paphos',
  'ΑΜΜΟΧΩΣΤΟΣ': 'Famagusta',
};

function buildSubmissionXml(petroleumType: number): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>PBL_MCIT_Petrol_PricesMob</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
      <CorrelationID/>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>petrol</SenderID>
        <Authentication>
          <Method>hash</Method>
          <Value>AbcvpSQ7jG55XOYBt8ngf0zXMMQ5qXT0/LjniIcHJwU=</Value>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <Body>
    <Message xmlns="http://gateway.gov/schema/common/v1">
      <Header><Vendor>Ariadni Team</Vendor></Header>
      <Body>
        <PetroleumPriceRequestMob xmlns="http://gateway.gov/schema/mcit/v1">
          <PetroleumType>${petroleumType}</PetroleumType>
        </PetroleumPriceRequestMob>
      </Body>
    </Message>
  </Body>
</GovTalkMessage>`;
}

function buildPollXml(correlationId: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>PBL_MCIT_Petrol_PricesMob</Class>
      <Qualifier>poll</Qualifier>
      <Function>submit</Function>
      <CorrelationID>${correlationId}</CorrelationID>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID/>
        <Authentication><Method>clear</Method><Value/></Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <GovTalkDetails><Keys><Key Type=""/></Keys></GovTalkDetails>
  <Body/>
</GovTalkMessage>`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface StationRecord {
  id: string;
  name: string;
  brand: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
}

interface PriceRecord {
  station_id: string;
  fuel_type: string;
  price: number;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
});

async function submitAndPoll(petroleumType: number): Promise<string> {
  console.log(`  Submitting request for fuel type ${petroleumType}...`);

  const submitRes = await fetch(GOV_API_SUBMIT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: buildSubmissionXml(petroleumType),
  });
  const submitXml = await submitRes.text();
  const submitParsed = parser.parse(submitXml);

  // Extract CorrelationID
  const correlationId =
    submitParsed?.GovTalkMessage?.Header?.MessageDetails?.CorrelationID;
  if (!correlationId) {
    throw new Error('No CorrelationID in submission response');
  }
  console.log(`  Got CorrelationID: ${correlationId}`);

  // Poll until we get a response (not just acknowledgement)
  let attempts = 0;
  const maxAttempts = 10;
  while (attempts < maxAttempts) {
    await sleep(25000); // Wait 25 seconds between polls
    console.log(`  Polling attempt ${attempts + 1}...`);

    const pollRes = await fetch(GOV_API_POLL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: buildPollXml(correlationId),
    });
    const pollXml = await pollRes.text();

    const qualifier =
      pollXml.match(/Qualifier>([^<]+)</)?.[1];
    if (qualifier === 'response') {
      console.log(`  Got response!`);
      return pollXml;
    }

    console.log(`  Still processing (qualifier: ${qualifier})...`);
    attempts++;
  }

  throw new Error(`Timed out waiting for response after ${maxAttempts} attempts`);
}

function parseStations(
  responseXml: string,
  fuelType: string
): { stations: StationRecord[]; prices: PriceRecord[] } {
  const stations: StationRecord[] = [];
  const prices: PriceRecord[] = [];

  // Extract all PetroleumPriceDetails1 blocks using regex for reliability
  const detailsRegex =
    /<PetroleumPriceDetails1>([\s\S]*?)<\/PetroleumPriceDetails1>/g;
  let match;
  while ((match = detailsRegex.exec(responseXml)) !== null) {
    const block = match[1];

    const stationCode = block.match(/<station_code>([^<]*)/)?.[1]?.trim();
    const stationName = block.match(/<station_name>([^<]*)/)?.[1]?.trim();
    const brandName = block.match(/<fuel_company_name>([^<]*)/)?.[1]?.trim();
    const city = block.match(/<station_city>([^<]*)/)?.[1]?.trim();
    const district = block.match(/<station_district>([^<]*)/)?.[1]?.trim();
    const address = block.match(/<station_address1>([^<]*)/)?.[1]?.trim();
    const priceStr = block.match(/<Fuel_Price>([^<]*)/)?.[1]?.trim();
    const coords = block.match(/<map_coordinates>([^<]*)/)?.[1]?.trim();
    const isOffline = block.match(/<isOffLine>([^<]*)/)?.[1]?.trim();

    if (!stationCode || !coords || !priceStr || isOffline === 'true') continue;

    const [latStr, lngStr] = coords.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) continue;

    // Map Greek city to English district
    const englishDistrict =
      CITY_MAP[city?.toUpperCase() ?? ''] ?? district ?? 'Unknown';

    // Clean up address — remove phone numbers
    const cleanAddress = address?.split('\n')[0]?.trim() ?? '';

    stations.push({
      id: stationCode,
      name: stationName?.replace(/"/g, '') ?? '',
      brand: brandName ?? '',
      address: cleanAddress,
      district: englishDistrict,
      lat,
      lng,
    });

    prices.push({
      station_id: stationCode,
      fuel_type: fuelType,
      price: parseFloat(priceStr),
    });
  }

  return { stations, prices };
}

async function main() {
  console.log('=== Lepidus Data Fetcher ===');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log('');

  const allStations = new Map<string, StationRecord>();
  const allPrices: PriceRecord[] = [];

  for (const [typeNum, fuelType] of Object.entries(FUEL_TYPES)) {
    console.log(`\nFetching ${fuelType} (type ${typeNum})...`);
    try {
      const responseXml = await submitAndPoll(parseInt(typeNum));
      const { stations, prices } = parseStations(responseXml, fuelType);

      console.log(`  Found ${stations.length} stations with ${fuelType} prices`);

      // Deduplicate stations (same station can appear in multiple fuel types)
      for (const station of stations) {
        if (!allStations.has(station.id)) {
          allStations.set(station.id, station);
        }
      }
      allPrices.push(...prices);
    } catch (error) {
      console.error(`  Error fetching ${fuelType}:`, error);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total unique stations: ${allStations.size}`);
  console.log(`Total price records: ${allPrices.length}`);

  // Upsert stations into Supabase
  console.log('\nUpserting stations to Supabase...');
  const stationRows = Array.from(allStations.values());
  const BATCH_SIZE = 100;

  for (let i = 0; i < stationRows.length; i += BATCH_SIZE) {
    const batch = stationRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('stations').upsert(batch, {
      onConflict: 'id',
    });
    if (error) {
      console.error(`  Error upserting stations batch ${i}:`, error);
    } else {
      console.log(
        `  Upserted stations ${i + 1}-${Math.min(i + BATCH_SIZE, stationRows.length)}`
      );
    }
  }

  // Insert price snapshots
  console.log('\nInserting price snapshots...');
  const priceRows = allPrices.map((p) => ({
    station_id: p.station_id,
    fuel_type: p.fuel_type,
    price: p.price,
    fetched_at: new Date().toISOString(),
  }));

  for (let i = 0; i < priceRows.length; i += BATCH_SIZE) {
    const batch = priceRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('price_snapshots').insert(batch);
    if (error) {
      console.error(`  Error inserting prices batch ${i}:`, error);
    } else {
      console.log(
        `  Inserted prices ${i + 1}-${Math.min(i + BATCH_SIZE, priceRows.length)}`
      );
    }
  }

  console.log('\n=== Done! ===');
}

main().catch(console.error);
