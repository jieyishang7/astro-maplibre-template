import fs from "node:fs";

const apiKey = process.env.NPS_API_KEY;

if (!apiKey) {
  console.error("Missing NPS_API_KEY");
  process.exit(1);
}

const endpoint =
  "https://developer.nps.gov/api/v1/parks?limit=600&fields=images";

async function main() {
  const response = await fetch(endpoint, {
    headers: { "X-Api-Key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`NPS API error: ${response.status}`);
  }

  const result = await response.json();
  const parks = result.data ?? [];

  const features = parks
    .filter((park) => {
      const lat = Number(park.latitude);
      const lon = Number(park.longitude);

      return (
        park.latitude !== "" &&
        park.longitude !== "" &&
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180 &&
        !(lat === 0 && lon === 0)
      );
    })
    .map((park) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [
          Number(park.longitude),
          Number(park.latitude),
        ],
      },
      properties: {
        name: park.fullName,
        type: park.designation,
        state: park.states,
        description: park.description,
        image: park.images?.[0]?.url ?? null,
        url: park.url,
        parkCode: park.parkCode,
      },
    }));

  const geojson = {
    type: "FeatureCollection",
    features,
  };

  fs.writeFileSync(
    "public/data/nps-parks.geojson",
    JSON.stringify(geojson, null, 2)
  );

  console.log(
    `Saved ${features.length} parks out of ${parks.length} API records.`
  );

  if (Number(result.total) > parks.length) {
    console.warn("More records exist; pagination is needed.");
  }
}

main().catch(console.error);
