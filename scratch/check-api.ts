async function main() {
  const res = await fetch('http://localhost:3000/api/public/fields?outbreakId=measles-2026');
  const data = await res.json();
  console.log(data.length);
  console.log(JSON.stringify(data.map(f => f.label), null, 2));
}

main().catch(console.error);
