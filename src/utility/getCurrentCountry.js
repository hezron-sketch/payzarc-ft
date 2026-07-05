export async function getCurrentCountry(countries = []) {
  try {
    const response = await fetch('https://ipapi.co/json/');
   
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    console.log('Raw API response:', data);
    if (data.error) {
      throw new Error(data.reason || 'Geolocation failed');
    }
    
    const countryName = data.country_name?.trim();
    const countryCodeIso = data.country_code?.toUpperCase();
    
    if (!countryName) {
      throw new Error('No country name returned');
    }

    // Step 1: Match by name (most accurate)
    let matchedCountry = countries.find(
      country => country.name.toLowerCase() === countryName.toLowerCase()
    );

    // Step 2: If no name match, match by ISO code
    if (!matchedCountry && countryCodeIso) {
      matchedCountry = countries.find(country => country.isoCode === countryCodeIso);
    }

    // Step 3: Special handling for +1 — prefer United States
    if (matchedCountry && matchedCountry.code === "+1") {
      const usCountry = countries.find(c => c.name === "United States");
      if (usCountry) {
        matchedCountry = usCountry; // Force US for +1
      }
    }

    if (matchedCountry) {
      return {
        name: matchedCountry.name,
        flag: matchedCountry.flag,
        code: matchedCountry.code,
      };
    }

    // Fallback if not in list
    return {
      name: countryName,
      flag: '🌍',
      code: data.country_calling_code || '+1',
    };
  } catch (error) {
    console.error('Geolocation fetch failed:', error);
    console.warn('Geolocation failed, defaulting to United States:', error.message);
    const defaultUS = countries.find(c => c.name === "United States");
    return defaultUS || {
      name: 'United States',
      flag: '🇺🇸',
      code: '+1'
    };
  }
}