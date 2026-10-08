const base = (process.argv[2] || 'http://127.0.0.1:5000/api').replace(/\/$/, '');

async function timed(path) {
  const started = performance.now();
  const response = await fetch(`${base}${path}`, { headers: { 'accept-encoding': 'gzip' } });
  const body = await response.arrayBuffer();
  return {
    path,
    status: response.status,
    durationMs: Number((performance.now() - started).toFixed(1)),
    bytes: body.byteLength,
    cacheControl: response.headers.get('cache-control'),
    encoding: response.headers.get('content-encoding'),
  };
}

async function main() {
  for (const path of ['/services', '/services', '/staff', '/staff', '/portfolio/recent?limit=12', '/portfolio/recent?limit=12']) {
    console.log(JSON.stringify(await timed(path)));
  }

  const [services, staffList] = await Promise.all([
    fetch(`${base}/services`).then((response) => response.json()),
    fetch(`${base}/staff`).then((response) => response.json()),
  ]);
  const service = services.find((item) => item.assignedStaff?.length);
  const staff = staffList.find((member) => service?.assignedStaff.some((item) => String(item._id || item) === String(member._id)));
  if (!service || !staff) return;

  let cursor = new Date();
  let date;
  for (let offset = 1; offset < 14; offset += 1) {
    cursor = new Date(cursor.getTime() + 86400000);
    const weekday = cursor.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    if (staff.workingHours.some((hours) => hours.day.toLowerCase() === weekday.toLowerCase())) {
      date = cursor.toISOString().slice(0, 10);
      break;
    }
  }
  if (!date) return;
  const query = new URLSearchParams({ staffId: staff._id, serviceId: service._id, date });
  console.log(JSON.stringify(await timed(`/appointments/slots?${query}`)));
  console.log(JSON.stringify(await timed(`/appointments/slots?${query}`)));
}

main().catch((error) => {
  console.error(`API profiling failed: ${error.message}`);
  process.exitCode = 1;
});
