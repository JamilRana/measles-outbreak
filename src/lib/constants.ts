export const DISTRICTS_BY_DIVISION: Record<string, string[]> = {
  'Barisal': ['Barguna', 'Barisal', 'Bhola', 'Jhalokathi', 'Patuakhali', 'Pirojpur'],
  'Chattogram': ['Bandarban', 'Brahmanbaria', 'Chandpur', 'Chattogram', "Cox's Bazar", 'Cumilla', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati', 'Feni'],
  'Dhaka': ['Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail'],
  'Khulna': ['Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
  'Mymensingh': ['Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'],
  'Rajshahi': ['Bogura', 'Chapainawabganj', 'Joypurhat', 'Naogaon', 'Natore', 'Pabna', 'Rajshahi', 'Sirajganj'],
  'Rangpur': ['Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon'],
  'Sylhet': ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet']
};

export const DIVISIONS = Object.keys(DISTRICTS_BY_DIVISION);

export const DISTRICTS: Record<string, string[]> = DISTRICTS_BY_DIVISION;