// Render's free Postgres plan gives one instance/one database. All 4
// services share that instance here (mirroring the docker-compose trick of
// one Postgres container hosting several logical databases) — this derives
// each service's own connection string by swapping just the database name
// on the single DATABASE_URL Render injects.
function withDb(baseUrl, dbName) {
  const url = new URL(baseUrl);
  url.pathname = `/${dbName}`;
  return url.toString();
}

module.exports = { withDb };
