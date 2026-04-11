// Minimal country metadata: ISO-2 → name, flag emoji, lat/lon centroid.
// Used for sidebar display and as a fallback when globe country data is unavailable.

export interface CountryMeta {
  iso2: string;
  iso3: string;
  name: string;
  lat: number;
  lon: number;
}

const ENTRIES: Array<[string, string, string, number, number]> = [
  ['AD', 'AND', 'Andorra', 42.5, 1.5],
  ['AE', 'ARE', 'United Arab Emirates', 24.0, 54.0],
  ['AF', 'AFG', 'Afghanistan', 33.0, 65.0],
  ['AG', 'ATG', 'Antigua and Barbuda', 17.05, -61.8],
  ['AL', 'ALB', 'Albania', 41.0, 20.0],
  ['AM', 'ARM', 'Armenia', 40.0, 45.0],
  ['AO', 'AGO', 'Angola', -12.5, 18.5],
  ['AR', 'ARG', 'Argentina', -34.0, -64.0],
  ['AT', 'AUT', 'Austria', 47.3, 13.3],
  ['AU', 'AUS', 'Australia', -27.0, 133.0],
  ['AZ', 'AZE', 'Azerbaijan', 40.5, 47.5],
  ['BA', 'BIH', 'Bosnia and Herzegovina', 44.0, 18.0],
  ['BB', 'BRB', 'Barbados', 13.1, -59.5],
  ['BD', 'BGD', 'Bangladesh', 24.0, 90.0],
  ['BE', 'BEL', 'Belgium', 50.8, 4.0],
  ['BF', 'BFA', 'Burkina Faso', 13.0, -2.0],
  ['BG', 'BGR', 'Bulgaria', 43.0, 25.0],
  ['BH', 'BHR', 'Bahrain', 26.0, 50.5],
  ['BI', 'BDI', 'Burundi', -3.5, 30.0],
  ['BJ', 'BEN', 'Benin', 9.5, 2.25],
  ['BN', 'BRN', 'Brunei', 4.5, 114.7],
  ['BO', 'BOL', 'Bolivia', -17.0, -65.0],
  ['BR', 'BRA', 'Brazil', -10.0, -55.0],
  ['BS', 'BHS', 'Bahamas', 24.25, -76.0],
  ['BT', 'BTN', 'Bhutan', 27.5, 90.5],
  ['BW', 'BWA', 'Botswana', -22.0, 24.0],
  ['BY', 'BLR', 'Belarus', 53.0, 28.0],
  ['BZ', 'BLZ', 'Belize', 17.25, -88.75],
  ['CA', 'CAN', 'Canada', 60.0, -95.0],
  ['CD', 'COD', 'DR Congo', 0.0, 25.0],
  ['CF', 'CAF', 'Central African Republic', 7.0, 21.0],
  ['CG', 'COG', 'Congo', -1.0, 15.0],
  ['CH', 'CHE', 'Switzerland', 47.0, 8.0],
  ['CI', 'CIV', "Côte d'Ivoire", 8.0, -5.0],
  ['CL', 'CHL', 'Chile', -30.0, -71.0],
  ['CM', 'CMR', 'Cameroon', 6.0, 12.0],
  ['CN', 'CHN', 'China', 35.0, 105.0],
  ['CO', 'COL', 'Colombia', 4.0, -72.0],
  ['CR', 'CRI', 'Costa Rica', 10.0, -84.0],
  ['CU', 'CUB', 'Cuba', 21.5, -80.0],
  ['CV', 'CPV', 'Cabo Verde', 16.0, -24.0],
  ['CY', 'CYP', 'Cyprus', 35.0, 33.0],
  ['CZ', 'CZE', 'Czechia', 49.75, 15.5],
  ['DE', 'DEU', 'Germany', 51.0, 9.0],
  ['DJ', 'DJI', 'Djibouti', 11.5, 43.0],
  ['DK', 'DNK', 'Denmark', 56.0, 10.0],
  ['DO', 'DOM', 'Dominican Republic', 19.0, -70.7],
  ['DZ', 'DZA', 'Algeria', 28.0, 3.0],
  ['EC', 'ECU', 'Ecuador', -2.0, -77.5],
  ['EE', 'EST', 'Estonia', 59.0, 26.0],
  ['EG', 'EGY', 'Egypt', 27.0, 30.0],
  ['ER', 'ERI', 'Eritrea', 15.0, 39.0],
  ['ES', 'ESP', 'Spain', 40.0, -4.0],
  ['ET', 'ETH', 'Ethiopia', 8.0, 38.0],
  ['FI', 'FIN', 'Finland', 64.0, 26.0],
  ['FJ', 'FJI', 'Fiji', -18.0, 175.0],
  ['FR', 'FRA', 'France', 46.0, 2.0],
  ['GA', 'GAB', 'Gabon', -1.0, 11.75],
  ['GB', 'GBR', 'United Kingdom', 54.0, -2.0],
  ['GE', 'GEO', 'Georgia', 42.0, 43.5],
  ['GH', 'GHA', 'Ghana', 8.0, -2.0],
  ['GM', 'GMB', 'Gambia', 13.5, -15.5],
  ['GN', 'GIN', 'Guinea', 11.0, -10.0],
  ['GQ', 'GNQ', 'Equatorial Guinea', 2.0, 10.0],
  ['GR', 'GRC', 'Greece', 39.0, 22.0],
  ['GT', 'GTM', 'Guatemala', 15.5, -90.25],
  ['GW', 'GNB', 'Guinea-Bissau', 12.0, -15.0],
  ['GY', 'GUY', 'Guyana', 5.0, -59.0],
  ['HK', 'HKG', 'Hong Kong', 22.25, 114.17],
  ['HN', 'HND', 'Honduras', 15.0, -86.5],
  ['HR', 'HRV', 'Croatia', 45.17, 15.5],
  ['HT', 'HTI', 'Haiti', 19.0, -72.4],
  ['HU', 'HUN', 'Hungary', 47.0, 20.0],
  ['ID', 'IDN', 'Indonesia', -5.0, 120.0],
  ['IE', 'IRL', 'Ireland', 53.0, -8.0],
  ['IL', 'ISR', 'Israel', 31.5, 34.75],
  ['IN', 'IND', 'India', 20.0, 77.0],
  ['IQ', 'IRQ', 'Iraq', 33.0, 44.0],
  ['IR', 'IRN', 'Iran', 32.0, 53.0],
  ['IS', 'ISL', 'Iceland', 65.0, -18.0],
  ['IT', 'ITA', 'Italy', 42.83, 12.83],
  ['JM', 'JAM', 'Jamaica', 18.25, -77.5],
  ['JO', 'JOR', 'Jordan', 31.0, 36.0],
  ['JP', 'JPN', 'Japan', 36.0, 138.0],
  ['KE', 'KEN', 'Kenya', 1.0, 38.0],
  ['KG', 'KGZ', 'Kyrgyzstan', 41.0, 75.0],
  ['KH', 'KHM', 'Cambodia', 13.0, 105.0],
  ['KR', 'KOR', 'South Korea', 37.0, 127.5],
  ['KW', 'KWT', 'Kuwait', 29.5, 45.75],
  ['KZ', 'KAZ', 'Kazakhstan', 48.0, 68.0],
  ['LA', 'LAO', 'Laos', 18.0, 105.0],
  ['LB', 'LBN', 'Lebanon', 33.83, 35.83],
  ['LK', 'LKA', 'Sri Lanka', 7.0, 81.0],
  ['LR', 'LBR', 'Liberia', 6.5, -9.5],
  ['LS', 'LSO', 'Lesotho', -29.5, 28.5],
  ['LT', 'LTU', 'Lithuania', 56.0, 24.0],
  ['LU', 'LUX', 'Luxembourg', 49.75, 6.17],
  ['LV', 'LVA', 'Latvia', 57.0, 25.0],
  ['LY', 'LBY', 'Libya', 25.0, 17.0],
  ['MA', 'MAR', 'Morocco', 32.0, -5.0],
  ['MD', 'MDA', 'Moldova', 47.0, 29.0],
  ['ME', 'MNE', 'Montenegro', 42.5, 19.3],
  ['MG', 'MDG', 'Madagascar', -20.0, 47.0],
  ['MK', 'MKD', 'North Macedonia', 41.83, 22.0],
  ['ML', 'MLI', 'Mali', 17.0, -4.0],
  ['MM', 'MMR', 'Myanmar', 22.0, 98.0],
  ['MN', 'MNG', 'Mongolia', 46.0, 105.0],
  ['MR', 'MRT', 'Mauritania', 20.0, -12.0],
  ['MT', 'MLT', 'Malta', 35.83, 14.58],
  ['MU', 'MUS', 'Mauritius', -20.28, 57.55],
  ['MV', 'MDV', 'Maldives', 3.25, 73.0],
  ['MW', 'MWI', 'Malawi', -13.5, 34.0],
  ['MX', 'MEX', 'Mexico', 23.0, -102.0],
  ['MY', 'MYS', 'Malaysia', 2.5, 112.5],
  ['MZ', 'MOZ', 'Mozambique', -18.25, 35.0],
  ['NA', 'NAM', 'Namibia', -22.0, 17.0],
  ['NE', 'NER', 'Niger', 16.0, 8.0],
  ['NG', 'NGA', 'Nigeria', 10.0, 8.0],
  ['NI', 'NIC', 'Nicaragua', 13.0, -85.0],
  ['NL', 'NLD', 'Netherlands', 52.5, 5.75],
  ['NO', 'NOR', 'Norway', 62.0, 10.0],
  ['NP', 'NPL', 'Nepal', 28.0, 84.0],
  ['NZ', 'NZL', 'New Zealand', -41.0, 174.0],
  ['OM', 'OMN', 'Oman', 21.0, 57.0],
  ['PA', 'PAN', 'Panama', 9.0, -80.0],
  ['PE', 'PER', 'Peru', -10.0, -76.0],
  ['PG', 'PNG', 'Papua New Guinea', -6.0, 147.0],
  ['PH', 'PHL', 'Philippines', 13.0, 122.0],
  ['PK', 'PAK', 'Pakistan', 30.0, 70.0],
  ['PL', 'POL', 'Poland', 52.0, 20.0],
  ['PR', 'PRI', 'Puerto Rico', 18.25, -66.5],
  ['PS', 'PSE', 'Palestine', 32.0, 35.25],
  ['PT', 'PRT', 'Portugal', 39.5, -8.0],
  ['PY', 'PRY', 'Paraguay', -23.0, -58.0],
  ['QA', 'QAT', 'Qatar', 25.5, 51.25],
  ['RO', 'ROU', 'Romania', 46.0, 25.0],
  ['RS', 'SRB', 'Serbia', 44.0, 21.0],
  ['RU', 'RUS', 'Russia', 60.0, 100.0],
  ['RW', 'RWA', 'Rwanda', -2.0, 30.0],
  ['SA', 'SAU', 'Saudi Arabia', 25.0, 45.0],
  ['SC', 'SYC', 'Seychelles', -4.58, 55.67],
  ['SD', 'SDN', 'Sudan', 15.0, 30.0],
  ['SE', 'SWE', 'Sweden', 62.0, 15.0],
  ['SG', 'SGP', 'Singapore', 1.37, 103.8],
  ['SI', 'SVN', 'Slovenia', 46.0, 15.0],
  ['SK', 'SVK', 'Slovakia', 48.67, 19.5],
  ['SL', 'SLE', 'Sierra Leone', 8.5, -11.5],
  ['SM', 'SMR', 'San Marino', 43.77, 12.42],
  ['SN', 'SEN', 'Senegal', 14.0, -14.0],
  ['SO', 'SOM', 'Somalia', 10.0, 49.0],
  ['SR', 'SUR', 'Suriname', 4.0, -56.0],
  ['SV', 'SLV', 'El Salvador', 13.83, -88.92],
  ['SY', 'SYR', 'Syria', 35.0, 38.0],
  ['SZ', 'SWZ', 'Eswatini', -26.5, 31.5],
  ['TD', 'TCD', 'Chad', 15.0, 19.0],
  ['TG', 'TGO', 'Togo', 8.0, 1.17],
  ['TH', 'THA', 'Thailand', 15.0, 100.0],
  ['TJ', 'TJK', 'Tajikistan', 39.0, 71.0],
  ['TM', 'TKM', 'Turkmenistan', 40.0, 60.0],
  ['TN', 'TUN', 'Tunisia', 34.0, 9.0],
  ['TR', 'TUR', 'Turkey', 39.0, 35.0],
  ['TT', 'TTO', 'Trinidad and Tobago', 11.0, -61.0],
  ['TW', 'TWN', 'Taiwan', 23.5, 121.0],
  ['TZ', 'TZA', 'Tanzania', -6.0, 35.0],
  ['UA', 'UKR', 'Ukraine', 49.0, 32.0],
  ['UG', 'UGA', 'Uganda', 1.0, 32.0],
  ['US', 'USA', 'United States', 38.0, -97.0],
  ['UY', 'URY', 'Uruguay', -33.0, -56.0],
  ['UZ', 'UZB', 'Uzbekistan', 41.0, 64.0],
  ['VE', 'VEN', 'Venezuela', 8.0, -66.0],
  ['VN', 'VNM', 'Vietnam', 16.0, 106.0],
  ['YE', 'YEM', 'Yemen', 15.5, 47.5],
  ['ZA', 'ZAF', 'South Africa', -29.0, 24.0],
  ['ZM', 'ZMB', 'Zambia', -15.0, 30.0],
  ['ZW', 'ZWE', 'Zimbabwe', -20.0, 30.0],
];

const byIso2 = new Map<string, CountryMeta>();
const byIso3 = new Map<string, CountryMeta>();

for (const [iso2, iso3, name, lat, lon] of ENTRIES) {
  const m: CountryMeta = { iso2, iso3, name, lat, lon };
  byIso2.set(iso2, m);
  byIso3.set(iso3, m);
}

export function getCountry(iso2: string): CountryMeta | null {
  return byIso2.get(iso2) || null;
}

export function getCountryByIso3(iso3: string): CountryMeta | null {
  return byIso3.get(iso3) || null;
}

export function iso3for(iso2: string): string | null {
  return byIso2.get(iso2)?.iso3 || null;
}

export function countryName(iso2: string): string {
  return byIso2.get(iso2)?.name || iso2;
}

export function flag(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return '🌐';
  const base = 0x1f1e6;
  return String.fromCodePoint(base + iso2.charCodeAt(0) - 65) +
         String.fromCodePoint(base + iso2.charCodeAt(1) - 65);
}
