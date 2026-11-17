// Approximate lat/lng coordinates for all 64 districts of Bangladesh
export const BD_DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  // Barisal Division
  'Barguna': { lat: 22.1510, lng: 90.1266 },
  'Barisal': { lat: 22.7010, lng: 90.3535 },
  'Bhola': { lat: 22.6859, lng: 90.6482 },
  'Jhalakathi': { lat: 22.6406, lng: 90.1987 },
  'Patuakhali': { lat: 22.3596, lng: 90.3290 },
  'Pirojpur': { lat: 22.5841, lng: 89.9720 },

  // Chattogram Division
  'Bandarban': { lat: 22.1953, lng: 92.2184 },
  'Brahmanbaria': { lat: 23.9608, lng: 91.1115 },
  'Chandpur': { lat: 23.2513, lng: 90.8518 },
  'Chattogram': { lat: 22.3569, lng: 91.7832 },
  "Cox's Bazar": { lat: 21.4272, lng: 92.0058 },
  'Cumilla': { lat: 23.4607, lng: 91.1809 },
  'Khagrachhari': { lat: 23.1322, lng: 91.9490 },
  'Lakshmipur': { lat: 22.9447, lng: 90.8282 },
  'Noakhali': { lat: 22.8724, lng: 91.0973 },
  'Rangamati': { lat: 22.7324, lng: 92.2985 },
  'Feni': { lat: 23.0159, lng: 91.3976 },

  // Dhaka Division
  'Dhaka': { lat: 23.8103, lng: 90.4125 },
  'Faridpur': { lat: 23.6070, lng: 89.8420 },
  'Gazipur': { lat: 24.0023, lng: 90.4264 },
  'Gopalganj': { lat: 23.0050, lng: 89.8266 },
  'Kishoreganj': { lat: 24.4449, lng: 90.7766 },
  'Madaripur': { lat: 23.1641, lng: 90.1978 },
  'Manikganj': { lat: 23.8617, lng: 90.0003 },
  'Munshiganj': { lat: 23.5422, lng: 90.5305 },
  'Narayanganj': { lat: 23.6238, lng: 90.5000 },
  'Narsingdi': { lat: 23.9322, lng: 90.7151 },
  'Rajbari': { lat: 23.7574, lng: 89.6445 },
  'Shariatpur': { lat: 23.2423, lng: 90.4348 },
  'Tangail': { lat: 24.2513, lng: 89.9164 },

  // Khulna Division
  'Bagerhat': { lat: 22.6512, lng: 89.7851 },
  'Chuadanga': { lat: 23.6402, lng: 88.8410 },
  'Jashore': { lat: 23.1665, lng: 89.2094 },
  'Jhenaidah': { lat: 23.5448, lng: 89.1539 },
  'Khulna': { lat: 22.8456, lng: 89.5403 },
  'Kushtia': { lat: 23.9013, lng: 89.1201 },
  'Magura': { lat: 23.4873, lng: 89.4200 },
  'Meherpur': { lat: 23.7622, lng: 88.6318 },
  'Narail': { lat: 23.1724, lng: 89.5126 },
  'Satkhira': { lat: 22.7185, lng: 89.0706 },

  // Mymensingh Division
  'Jamalpur': { lat: 24.9375, lng: 89.9372 },
  'Mymensingh': { lat: 24.7471, lng: 90.4203 },
  'Netrokona': { lat: 24.8704, lng: 90.7279 },
  'Sherpur': { lat: 25.0204, lng: 90.0153 },

  // Rajshahi Division
  'Bogura': { lat: 24.8465, lng: 89.3773 },
  'Chapainawabganj': { lat: 24.5965, lng: 88.2776 },
  'Joypurhat': { lat: 25.0968, lng: 89.0227 },
  'Naogaon': { lat: 24.7936, lng: 88.9318 },
  'Natore': { lat: 24.4206, lng: 89.0000 },
  'Pabna': { lat: 24.0064, lng: 89.2372 },
  'Rajshahi': { lat: 24.3636, lng: 88.6241 },
  'Sirajganj': { lat: 24.4534, lng: 89.7000 },

  // Rangpur Division
  'Dinajpur': { lat: 25.6279, lng: 88.6332 },
  'Gaibandha': { lat: 25.3288, lng: 89.5280 },
  'Kurigram': { lat: 25.8054, lng: 89.6362 },
  'Lalmonirhat': { lat: 25.9165, lng: 89.4447 },
  'Nilphamari': { lat: 25.9316, lng: 88.8560 },
  'Panchagarh': { lat: 26.3411, lng: 88.5542 },
  'Rangpur': { lat: 25.7439, lng: 89.2752 },
  'Thakurgaon': { lat: 26.0336, lng: 88.4616 },

  // Sylhet Division
  'Habiganj': { lat: 24.3890, lng: 91.4155 },
  'Moulvibazar': { lat: 24.4830, lng: 91.7774 },
  'Sunamganj': { lat: 25.0658, lng: 91.3950 },
  'Sylhet': { lat: 24.8949, lng: 91.8687 },
};

// Official Bangladesh Bureau of Statistics (BBS 2022 Census) district populations
export const BD_DISTRICT_POPULATION: Record<string, number> = {
  // Barisal
  'Barguna': 1010530,
  'Barisal': 2570450,
  'Bhola': 1932514,
  'Jhalakathi': 710000,
  'Patuakhali': 1727254,
  'Pirojpur': 1198195,

  // Chattogram
  'Bandarban': 481109,
  'Brahmanbaria': 3306559,
  'Chandpur': 2635748,
  'Chattogram': 9169464,
  "Cox's Bazar": 2823265,
  'Cumilla': 6212216,
  'Feni': 1648896,
  'Khagrachhari': 714119,
  'Lakshmipur': 1937948,
  'Noakhali': 3625252,
  'Rangamati': 647587,

  // Dhaka
  'Dhaka': 14734025,
  'Faridpur': 2162876,
  'Gazipur': 5263474,
  'Gopalganj': 1295053,
  'Kishoreganj': 3267630,
  'Madaripur': 1293027,
  'Manikganj': 1558024,
  'Munshiganj': 1621379,
  'Narayanganj': 3909138,
  'Narsingdi': 2584452,
  'Rajbari': 1189821,
  'Shariatpur': 1254546,
  'Tangail': 4037608,

  // Khulna
  'Bagerhat': 1613079,
  'Chuadanga': 1234066,
  'Jashore': 3076849,
  'Jhenaidah': 2005849,
  'Khulna': 2613385,
  'Kushtia': 2149692,
  'Magura': 1033115,
  'Meherpur': 705356,
  'Narail': 788673,
  'Satkhira': 2196581,

  // Mymensingh
  'Jamalpur': 2499737,
  'Mymensingh': 5899052,
  'Netrokona': 2324856,
  'Sherpur': 1501189,

  // Rajshahi
  'Bogura': 3734300,
  'Chapainawabganj': 1835528,
  'Joypurhat': 956447,
  'Naogaon': 2784598,
  'Natore': 1859921,
  'Pabna': 2909622,
  'Rajshahi': 2915013,
  'Sirajganj': 3357758,

  // Rangpur
  'Dinajpur': 3315238,
  'Gaibandha': 2562232,
  'Kurigram': 2329161,
  'Lalmonirhat': 1428406,
  'Nilphamari': 2092567,
  'Panchagarh': 1179843,
  'Rangpur': 3169615,
  'Thakurgaon': 1534395,

  // Sylhet
  'Habiganj': 2358886,
  'Moulvibazar': 2123445,
  'Sunamganj': 2695495,
  'Sylhet': 3857037,
};
