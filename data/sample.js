import { seeded } from './random.js?v=1919cefb67302b76';

export function demoData() {
  const random = seeded(91);
  const headers = ['trip_date', 'distance_km', 'elevation_m', 'temperature_c', 'traffic', 'bike_type', 'duration_min'];
  const rows = Array.from({ length: 420 }, (_, day) => {
    const distance = Number((1 + random() * 18).toFixed(1));
    const elevation = Math.round(random() * 170);
    const temperature = Math.round(5 + random() * 23);
    const traffic = ['Light', 'Moderate', 'Heavy'][Math.floor(random() * 3)];
    const bike = random() > 0.6 ? 'Electric' : 'Standard';
    const delay = { Light: 0, Moderate: 3, Heavy: 8 }[traffic];
    const duration = 4 + distance * (bike === 'Electric' ? 2.4 : 3.4)
      + elevation * 0.045 + delay + (random() - 0.5) * 7;
    return [
      new Date(Date.UTC(2025, 0, 1 + day)).toISOString().slice(0, 10),
      String(distance), String(elevation), day % 37 === 0 ? '' : String(temperature),
      traffic, bike, String(Number(duration.toFixed(1))),
    ];
  });
  // Deliberate quality issues for the sample's outlier and duplicate checks.
  rows[36][1] = '46.8';
  rows[111][2] = '620';
  rows.push([...rows[12]], [...rows[54]]);
  return { name: 'city-bike-trips.csv', demo: true, headers, rows, delimiter: ',', warnings: [] };
}
