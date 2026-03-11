async function main() {
  console.log("No frontend product seed: product data is owned by FastAPI.");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
