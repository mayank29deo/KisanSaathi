export async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,precipitation,relative_humidity_2m,wind_speed_10m&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather");
  return res.json();
}
