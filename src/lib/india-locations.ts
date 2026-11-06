export interface IndiaState {
  name: string;
  isoCode: string;
  countryCode: string;
}

export interface IndiaCity {
  name: string;
  stateCode: string;
  countryCode: string;
}

const INDIA_STATES_AND_CITIES: Array<{ isoCode: string; name: string; cities: string[] }> = [
  { isoCode: "AN", name: "Andaman and Nicobar Islands", cities: ["Port Blair", "Havelock Island", "Neil Island", "Diglipur"] },
  { isoCode: "AP", name: "Andhra Pradesh", cities: ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati", "Kurnool", "Rajahmundry", "Kakinada", "Anantapur", "Kadapa"] },
  { isoCode: "AR", name: "Arunachal Pradesh", cities: ["Itanagar", "Tawang", "Ziro", "Pasighat", "Bomdila", "Roing"] },
  { isoCode: "AS", name: "Assam", cities: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Tezpur", "Nagaon", "Tinsukia"] },
  { isoCode: "BR", name: "Bihar", cities: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia", "Rajgir", "Bodh Gaya"] },
  { isoCode: "CH", name: "Chandigarh", cities: ["Chandigarh"] },
  { isoCode: "CT", name: "Chhattisgarh", cities: ["Raipur", "Bhilai", "Bilaspur", "Korba", "Jagdalpur", "Durg", "Ambikapur"] },
  { isoCode: "DH", name: "Dadra and Nagar Haveli and Daman and Diu", cities: ["Daman", "Diu", "Silvassa"] },
  { isoCode: "DL", name: "Delhi", cities: ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Central Delhi", "Dwarka", "Rohini"] },
  { isoCode: "GA", name: "Goa", cities: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Calangute", "Candolim"] },
  { isoCode: "GJ", name: "Gujarat", cities: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Bhuj", "Kutch"] },
  { isoCode: "HR", name: "Haryana", cities: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar", "Rohtak", "Sonipat", "Panchkula"] },
  { isoCode: "HP", name: "Himachal Pradesh", cities: ["Shimla", "Manali", "Dharamshala", "Kullu", "Solan", "Mandi", "Dalhousie", "Kasauli", "Spiti"] },
  { isoCode: "JK", name: "Jammu and Kashmir", cities: ["Srinagar", "Jammu", "Gulmarg", "Pahalgam", "Sonamarg", "Anantnag", "Baramulla", "Udhampur"] },
  { isoCode: "JH", name: "Jharkhand", cities: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Netarhat"] },
  { isoCode: "KA", name: "Karnataka", cities: ["Bengaluru", "Bangalore", "Mysuru", "Mysore", "Mangaluru", "Mangalore", "Hubballi", "Belagavi", "Udupi", "Hampi", "Coorg", "Chikkamagaluru"] },
  { isoCode: "KL", name: "Kerala", cities: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam", "Alappuzha", "Munnar", "Wayanad", "Kottayam", "Palakkad", "Kannur"] },
  { isoCode: "LA", name: "Ladakh", cities: ["Leh", "Kargil", "Nubra", "Pangong"] },
  { isoCode: "LD", name: "Lakshadweep", cities: ["Kavaratti", "Agatti", "Minicoy"] },
  { isoCode: "MP", name: "Madhya Pradesh", cities: ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Khajuraho", "Orchha", "Pachmarhi", "Sagar", "Rewa"] },
  { isoCode: "MH", name: "Maharashtra", cities: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Thane", "Navi Mumbai", "Kolhapur", "Lonavala", "Mahabaleshwar", "Alibaug", "Karjat", "Satara", "Solapur"] },
  { isoCode: "MN", name: "Manipur", cities: ["Imphal", "Ukhrul", "Churachandpur", "Thoubal"] },
  { isoCode: "ML", name: "Meghalaya", cities: ["Shillong", "Cherrapunji", "Tura", "Jowai", "Dawki"] },
  { isoCode: "MZ", name: "Mizoram", cities: ["Aizawl", "Lunglei", "Champhai"] },
  { isoCode: "NL", name: "Nagaland", cities: ["Kohima", "Dimapur", "Mokokchung"] },
  { isoCode: "OR", name: "Odisha", cities: ["Bhubaneswar", "Cuttack", "Puri", "Rourkela", "Sambalpur", "Berhampur", "Konark"] },
  { isoCode: "PY", name: "Puducherry", cities: ["Puducherry", "Karaikal", "Mahe", "Yanam"] },
  { isoCode: "PB", name: "Punjab", cities: ["Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Mohali", "Bathinda", "Pathankot", "Kapurthala"] },
  { isoCode: "RJ", name: "Rajasthan", cities: ["Jaipur", "Udaipur", "Jodhpur", "Jaisalmer", "Pushkar", "Bikaner", "Ajmer", "Kota", "Mount Abu", "Alwar", "Chittorgarh", "Mandawa"] },
  { isoCode: "SK", name: "Sikkim", cities: ["Gangtok", "Pelling", "Lachung", "Namchi"] },
  { isoCode: "TN", name: "Tamil Nadu", cities: ["Chennai", "Coimbatore", "Madurai", "Ooty", "Kodaikanal", "Tiruchirappalli", "Salem", "Tirunelveli", "Vellore", "Thanjavur", "Mahabalipuram", "Kanyakumari"] },
  { isoCode: "TG", name: "Telangana", cities: ["Hyderabad", "Secunderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramoji Film City"] },
  { isoCode: "TR", name: "Tripura", cities: ["Agartala", "Udaipur", "Dharmanagar"] },
  { isoCode: "UP", name: "Uttar Pradesh", cities: ["Lucknow", "Noida", "Greater Noida", "Varanasi", "Agra", "Kanpur", "Prayagraj", "Mathura", "Vrindavan", "Jhansi", "Meerut", "Gorakhpur", "Bareilly"] },
  { isoCode: "UT", name: "Uttarakhand", cities: ["Dehradun", "Rishikesh", "Mussoorie", "Nainital", "Haridwar", "Haldwani", "Auli", "Almora", "Jim Corbett", "Ranikhet"] },
  { isoCode: "WB", name: "West Bengal", cities: ["Kolkata", "Darjeeling", "Siliguri", "Howrah", "Durgapur", "Asansol", "Kalimpong", "Shantiniketan", "Sundarbans"] }
];

export const State = {
  getStatesOfCountry(countryCode: string): IndiaState[] {
    if (countryCode !== "IN") return [];
    return INDIA_STATES_AND_CITIES.map((s) => ({
      name: s.name,
      isoCode: s.isoCode,
      countryCode: "IN"
    }));
  }
};

export const City = {
  getCitiesOfState(countryCode: string, stateCode: string): IndiaCity[] {
    if (countryCode !== "IN") return [];
    const found = INDIA_STATES_AND_CITIES.find((s) => s.isoCode === stateCode);
    if (!found) return [];
    return found.cities.map((name) => ({
      name,
      stateCode: found.isoCode,
      countryCode: "IN"
    }));
  }
};

