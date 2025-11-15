// Import JSON data files
import regionsData from './region.json'
import provincesData from './province.json'
import citiesData from './city.json'
import barangaysData from './barangay.json'

// Type definitions based on JSON structure
interface Region {
  id: number
  psgc_code: string
  region_name: string
  region_code: string
}

interface Province {
  province_code: string
  province_name: string
  psgc_code: string
  region_code: string
}

interface City {
  city_code: string
  city_name: string
  province_code: string
  psgc_code: string
  region_desc: string
}

interface Barangay {
  brgy_code: string
  brgy_name: string
  city_code: string
  province_code: string
  region_code: string
}

// Get all regions
export const philippinesRegions = (regionsData as Region[]).map(r => r.region_name).sort()

// Get provinces for a specific region
export const getProvincesForRegion = (regionName: string): string[] => {
  if (!regionName) return []
  
  // Find the region code for the given region name
  const region = (regionsData as Region[]).find(r => r.region_name === regionName)
  if (!region) return []
  
  // Filter provinces by region_code
  const provinces = (provincesData as Province[]).filter(p => p.region_code === region.region_code)
  return provinces.map(p => p.province_name).sort()
}

// Get cities for a specific province
export const getCitiesForProvince = (regionName: string, provinceName: string): string[] => {
  if (!regionName || !provinceName) return []
  
  // Find the region code
  const region = (regionsData as Region[]).find(r => r.region_name === regionName)
  if (!region) return []
  
  // Find the province code
  const province = (provincesData as Province[]).find(
    p => p.province_name === provinceName && p.region_code === region.region_code
  )
  if (!province) return []
  
  // Filter cities by province_code
  const cities = (citiesData as City[]).filter(c => c.province_code === province.province_code)
  return cities.map(c => c.city_name).sort()
}

// Get barangays for a specific city
export const getBarangaysForCity = (regionName: string, provinceName: string, cityName: string): string[] => {
  if (!regionName || !provinceName || !cityName) return []
  
  // Find the region code
  const region = (regionsData as Region[]).find(r => r.region_name === regionName)
  if (!region) return []
  
  // Find the province code
  const province = (provincesData as Province[]).find(
    p => p.province_name === provinceName && p.region_code === region.region_code
  )
  if (!province) return []
  
  // Find the city code
  const city = (citiesData as City[]).find(
    c => c.city_name === cityName && c.province_code === province.province_code
  )
  if (!city) return []
  
  // Filter barangays by city_code
  const barangays = (barangaysData as Barangay[]).filter(b => b.city_code === city.city_code)
  return barangays.map(b => b.brgy_name).sort()
}
