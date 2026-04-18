import { PrismaClient, ReportStatus } from '@prisma/client';

const prisma = new PrismaClient();

const districtMap: { [key: string]: string } = {
  'jhalkathi': 'Jhalokati',
  'jhalkathi ': 'Jhalokati',
  'coxsbazar': "Cox's Bazar",
  'khagrachari': 'Khagrachhari',
  'gopalganj': 'Gopalganj',
  'gopalganj ': 'Gopalganj',
  'chapainawabganj': 'Chapainawabganj',
  'moulvibazar': 'Moulvibazar',
  'bhola': 'Bhola',
  'bandarban ': 'Bandarban',
  'cumilla': 'Cumilla',
  'rangamati': 'Rangamati',
  'faridpur ': 'Faridpur',
  'gazipur ': 'Gazipur',
  'tangail ': 'Tangail',
  'gopalganj 	': 'Gopalganj',
  'kishoreganj	': 'Kishoreganj',
  'madaripur	': 'Madaripur',
  'manikganj 	': 'Manikganj',
  'narayanganj 	': 'Narayanganj',
  'narsingdi	': 'Narsingdi',
  'rajshahi	': 'Rajshahi',
};

const rawData: any = {
  '2026-04-17': [
    ['Barguna', 33, 11, 12, 0, 0, 2], ['Barisal', 9, 9, 15, 0, 0, 0], ['Bhola', 8, 8, 3, 0, 0, 0], ['Jhalokati', 9, 6, 4, 0, 0, 0], ['Patuakhali', 21, 21, 30, 0, 0, 0], ['Pirojpur', 8, 5, 6, 0, 1, 0],
    ['Bandarban', 3, 3, 2, 0, 0, 0], ['Brahmanbaria', 10, 10, 0, 0, 0, 0], ['Chandpur', 12, 10, 13, 0, 0, 0], ['Chattogram', 15, 15, 20, 0, 0, 0], ['Cox\'s Bazar', 35, 35, 27, 0, 0, 0], ['Cumilla', 20, 20, 22, 0, 0, 0], ['Feni', 1, 2, 4, 0, 0, 0], ['Khagrachhari', 0, 0, 0, 0, 0, 0], ['Lakshmipur', 15, 15, 16, 0, 0, 0], ['Noakhali', 26, 23, 11, 0, 0, 0], ['Rangamati', 0, 0, 0, 0, 0, 0],
    ['Dhaka', 362, 227, 164, 1, 112, 1], ['Faridpur', 23, 21, 22, 0, 0, 0], ['Gazipur', 14, 14, 21, 0, 0, 0], ['Gopalganj', 20, 18, 8, 0, 0, 0], ['Kishoreganj', 29, 21, 18, 0, 0, 0], ['Madaripur', 13, 10, 19, 0, 0, 0], ['Manikganj', 8, 8, 18, 1, 0, 0], ['Munshiganj', 6, 3, 5, 0, 0, 0], ['Narayanganj', 0, 0, 0, 0, 0, 0], ['Narsingdi', 7, 7, 12, 0, 7, 0], ['Rajbari', 6, 6, 4, 0, 0, 0], ['Shariatpur', 9, 6, 3, 0, 0, 0], ['Tangail', 18, 16, 19, 0, 1, 0],
    ['Bagerhat', 1, 1, 7, 0, 1, 0], ['Chuadanga', 1, 1, 1, 0, 0, 0], ['Jashore', 14, 13, 20, 0, 0, 0], ['Jhenaidah', 4, 4, 2, 0, 0, 0], ['Khulna', 9, 9, 9, 0, 0, 0], ['Kushtia', 21, 21, 57, 0, 0, 0], ['Magura', 10, 10, 15, 0, 0, 0], ['Meherpur', 6, 3, 1, 0, 0, 0], ['Narail', 7, 7, 4, 0, 0, 0], ['Satkhira', 4, 4, 2, 0, 0, 0],
    ['Jamalpur', 3, 3, 5, 0, 0, 0], ['Mymensingh', 1, 0, 0, 0, 0, 0], ['Netrokona', 9, 9, 6, 0, 0, 0], ['Sherpur', 2, 0, 0, 0, 0, 0],
    ['Bogura', 4, 7, 9, 0, 0, 0], ['Chapainawabganj', 23, 23, 29, 0, 0, 0], ['Joypurhat', 5, 4, 5, 0, 0, 0], ['Naogaon', 13, 9, 4, 0, 0, 0], ['Natore', 7, 3, 5, 0, 0, 0], ['Pabna', 20, 20, 11, 0, 0, 0], ['Rajshahi', 140, 19, 24, 0, 0, 0], ['Sirajganj', 5, 5, 2, 0, 5, 0],
    ['Dinajpur', 0, 0, 0, 0, 0, 0], ['Gaibandha', 3, 1, 1, 0, 0, 0], ['Kurigram', 0, 0, 0, 0, 0, 0], ['Lalmonirhat', 4, 1, 1, 0, 0, 0], ['Nilphamari', 5, 1, 1, 0, 0, 0], ['Panchagarh', 0, 0, 1, 0, 0, 0], ['Rangpur', 0, 0, 0, 0, 0, 0], ['Thakurgaon', 1, 1, 1, 0, 0, 0],
    ['Habiganj', 9, 9, 2, 0, 0, 0], ['Moulvibazar', 9, 9, 3, 0, 0, 0], ['Sunamganj', 21, 11, 18, 0, 0, 0], ['Sylhet', 14, 11, 3, 0, 0, 0]
  ],
  '2026-04-16': [
    ['Barguna', 23, 13, 6, 0, 0, 0], ['Barisal', 26, 11, 5, 0, 0, 0], ['Bhola', 7, 7, 6, 0, 0, 0], ['Jhalokati', 5, 3, 2, 0, 0, 0], ['Patuakhali', 18, 18, 12, 0, 0, 0], ['Pirojpur', 8, 4, 2, 0, 6, 0],
    ['Bandarban', 3, 3, 2, 0, 0, 0], ['Brahmanbaria', 8, 8, 12, 0, 2, 0], ['Chandpur', 20, 20, 6, 0, 0, 0], ['Chattogram', 20, 20, 13, 0, 0, 0], ['Cox\'s Bazar', 39, 39, 40, 1, 0, 0], ['Cumilla', 24, 19, 10, 0, 0, 0], ['Feni', 9, 3, 7, 0, 0, 0], ['Khagrachhari', 0, 0, 0, 0, 0, 0], ['Lakshmipur', 18, 18, 13, 0, 0, 0], ['Noakhali', 15, 10, 7, 0, 0, 0], ['Rangamati', 0, 0, 0, 0, 0, 0],
    ['Dhaka', 365, 233, 221, 2, 76, 2], ['Faridpur', 20, 20, 23, 0, 0, 0], ['Gazipur', 18, 18, 23, 0, 0, 0], ['Gopalganj', 25, 23, 18, 0, 1, 0], ['Kishoreganj', 15, 14, 20, 0, 0, 0], ['Madaripur', 4, 4, 5, 0, 0, 0], ['Manikganj', 11, 11, 2, 0, 1, 0], ['Munshiganj', 4, 2, 3, 0, 0, 0], ['Narayanganj', 2, 1, 0, 0, 0, 0], ['Narsingdi', 6, 6, 3, 0, 0, 0], ['Rajbari', 1, 1, 4, 0, 0, 0], ['Shariatpur', 2, 2, 9, 0, 0, 0], ['Tangail', 23, 23, 22, 0, 0, 0],
    ['Bagerhat', 17, 13, 9, 0, 2, 0], ['Chuadanga', 3, 3, 3, 0, 0, 0], ['Jashore', 14, 13, 1, 0, 0, 0], ['Jhenaidah', 4, 4, 2, 0, 0, 0], ['Khulna', 7, 7, 2, 0, 0, 0], ['Kushtia', 39, 39, 15, 0, 0, 0], ['Magura', 8, 8, 9, 0, 0, 0], ['Meherpur', 2, 1, 8, 0, 0, 0], ['Narail', 7, 7, 3, 0, 0, 0], ['Satkhira', 2, 2, 8, 0, 0, 0],
    ['Jamalpur', 14, 14, 4, 0, 0, 0], ['Mymensingh', 2, 1, 1, 0, 0, 0], ['Netrokona', 9, 6, 2, 0, 0, 0], ['Sherpur', 7, 6, 0, 0, 0, 0],
    ['Bogura', 11, 14, 10, 0, 0, 0], ['Chapainawabganj', 21, 21, 44, 0, 0, 0], ['Joypurhat', 4, 2, 4, 0, 0, 0], ['Naogaon', 2, 2, 7, 0, 2, 0], ['Natore', 6, 6, 5, 0, 0, 0], ['Pabna', 12, 12, 11, 0, 0, 0], ['Rajshahi', 149, 15, 30, 1, 0, 0], ['Sirajganj', 2, 2, 2, 0, 2, 0],
    ['Dinajpur', 20, 0, 0, 0, 0, 0], ['Gaibandha', 3, 1, 0, 0, 0, 0], ['Kurigram', 1, 0, 0, 0, 0, 0], ['Lalmonirhat', 1, 0, 2, 0, 0, 0], ['Nilphamari', 3, 3, 1, 0, 0, 0], ['Panchagarh', 1, 1, 0, 0, 0, 0], ['Rangpur', 10, 0, 0, 0, 0, 0], ['Thakurgaon', 3, 3, 1, 0, 0, 0],
    ['Habiganj', 9, 9, 2, 0, 0, 0], ['Moulvibazar', 26, 19, 12, 1, 0, 0], ['Sunamganj', 22, 14, 16, 1, 0, 0], ['Sylhet', 11, 9, 14, 0, 0, 0]
  ],
  '2026-04-15': [
    ['Barguna', 22, 7, 4, 0, 0, 0], ['Barisal', 11, 0, 0, 0, 0, 0], ['Bhola', 11, 11, 12, 0, 0, 0], ['Jhalokati', 0, 0, 0, 0, 0, 0], ['Patuakhali', 21, 21, 13, 0, 0, 0], ['Pirojpur', 0, 0, 0, 0, 0, 0],
    ['Bandarban', 3, 3, 0, 0, 0, 0], ['Brahmanbaria', 4, 4, 0, 0, 0, 0], ['Chandpur', 11, 11, 4, 0, 0, 0], ['Chattogram', 14, 14, 9, 0, 0, 0], ['Cox\'s Bazar', 33, 33, 19, 0, 0, 0], ['Cumilla', 19, 19, 14, 0, 0, 0], ['Feni', 0, 2, 0, 0, 0, 0], ['Khagrachhari', 0, 0, 0, 0, 0, 0], ['Lakshmipur', 3, 3, 5, 0, 0, 0], ['Noakhali', 13, 13, 18, 0, 0, 0], ['Rangamati', 0, 0, 0, 0, 0, 0],
    ['Dhaka', 397, 216, 145, 1, 60, 1], ['Faridpur', 20, 20, 16, 0, 0, 0], ['Gazipur', 16, 16, 3, 0, 0, 0], ['Gopalganj', 13, 7, 8, 0, 0, 0], ['Kishoreganj', 8, 5, 5, 0, 1, 0], ['Madaripur', 6, 6, 3, 0, 0, 0], ['Manikganj', 12, 12, 7, 0, 0, 0], ['Munshiganj', 0, 0, 0, 0, 0, 0], ['Narayanganj', 0, 0, 0, 0, 0, 0], ['Narsingdi', 6, 6, 9, 0, 0, 0], ['Rajbari', 0, 0, 0, 0, 0, 0], ['Shariatpur', 9, 9, 0, 1, 0, 0], ['Tangail', 18, 18, 9, 0, 0, 0],
    ['Bagerhat', 0, 0, 0, 0, 0, 0], ['Chuadanga', 2, 2, 29, 0, 0, 0], ['Jashore', 13, 13, 12, 0, 0, 0], ['Jhenaidah', 1, 1, 3, 0, 0, 0], ['Khulna', 13, 13, 6, 0, 0, 0], ['Kushtia', 26, 26, 30, 0, 0, 0], ['Magura', 8, 8, 9, 0, 0, 0], ['Meherpur', 5, 3, 2, 0, 0, 0], ['Narail', 0, 0, 3, 0, 0, 0], ['Satkhira', 2, 2, 0, 0, 0, 0],
    ['Jamalpur', 0, 0, 0, 0, 0, 0], ['Mymensingh', 0, 0, 0, 0, 0, 0], ['Netrokona', 1, 1, 4, 0, 0, 0], ['Sherpur', 0, 0, 1, 0, 0, 0],
    ['Bogura', 12, 12, 6, 0, 1, 0], ['Chapainawabganj', 40, 40, 5, 0, 0, 0], ['Joypurhat', 1, 1, 0, 0, 0, 0], ['Naogaon', 2, 2, 0, 0, 0, 0], ['Natore', 17, 7, 0, 0, 0, 0], ['Pabna', 14, 14, 10, 0, 0, 0], ['Rajshahi', 164, 24, 14, 0, 0, 0], ['Sirajganj', 11, 11, 13, 0, 11, 0],
    ['Dinajpur', 0, 0, 0, 0, 0, 0], ['Gaibandha', 0, 0, 0, 0, 0, 0], ['Kurigram', 0, 0, 0, 0, 0, 0], ['Lalmonirhat', 0, 0, 0, 0, 0, 0], ['Nilphamari', 0, 0, 1, 0, 0, 0], ['Panchagarh', 0, 0, 0, 0, 0, 0], ['Rangpur', 0, 0, 0, 0, 0, 0], ['Thakurgaon', 0, 0, 0, 0, 0, 0],
    ['Habiganj', 1, 1, 0, 0, 0, 0], ['Moulvibazar', 8, 8, 2, 0, 0, 0], ['Sunamganj', 14, 14, 11, 0, 3, 0], ['Sylhet', 7, 7, 4, 0, 0, 0]
  ],
  '2026-04-14': [
    ['Barguna', 22, 8, 4, 0, 0, 0], ['Barisal', 5, 5, 3, 0, 0, 0], ['Bhola', 9, 9, 9, 0, 0, 0], ['Jhalokati', 6, 2, 3, 0, 0, 0], ['Patuakhali', 18, 18, 23, 0, 0, 0], ['Pirojpur', 11, 4, 8, 0, 0, 0],
    ['Bandarban', 3, 3, 0, 0, 0, 0], ['Brahmanbaria', 3, 3, 3, 0, 0, 0], ['Chandpur', 10, 10, 6, 0, 0, 0], ['Chattogram', 28, 28, 35, 0, 2, 1], ['Cox\'s Bazar', 23, 23, 40, 1, 0, 0], ['Cumilla', 37, 23, 306, 0, 1, 0], ['Feni', 2, 2, 5, 0, 0, 0], ['Khagrachhari', 0, 0, 0, 0, 0, 0], ['Lakshmipur', 9, 9, 6, 0, 0, 0], ['Noakhali', 8, 8, 10, 0, 0, 0], ['Rangamati', 0, 0, 0, 0, 0, 0],
    ['Dhaka', 316, 179, 155, 4, 149, 0], ['Faridpur', 21, 0, 16, 1, 0, 0], ['Gazipur', 24, 24, 24, 0, 0, 0], ['Gopalganj', 20, 17, 14, 0, 0, 0], ['Kishoreganj', 13, 12, 9, 0, 0, 0], ['Madaripur', 6, 6, 6, 0, 0, 0], ['Manikganj', 15, 14, 4, 0, 4, 0], ['Munshiganj', 5, 5, 3, 0, 1, 0], ['Narayanganj', 0, 0, 0, 0, 0, 0], ['Narsingdi', 13, 7, 5, 0, 0, 0], ['Rajbari', 8, 5, 1, 0, 0, 0], ['Shariatpur', 8, 3, 2, 0, 2, 0], ['Tangail', 36, 18, 19, 1, 1, 0],
    ['Bagerhat', 0, 0, 2, 0, 0, 0], ['Chuadanga', 4, 4, 4, 0, 0, 0], ['Jashore', 15, 13, 10, 0, 0, 0], ['Jhenaidah', 3, 0, 5, 0, 0, 0], ['Khulna', 11, 11, 16, 0, 3, 0], ['Kushtia', 25, 25, 21, 0, 0, 0], ['Magura', 11, 10, 5, 0, 0, 0], ['Meherpur', 14, 10, 9, 0, 0, 0], ['Narail', 2, 1, 3, 0, 0, 0], ['Satkhira', 2, 2, 4, 0, 0, 0],
    ['Jamalpur', 4, 4, 6, 0, 0, 0], ['Mymensingh', 0, 0, 0, 0, 0, 0], ['Netrokona', 8, 7, 3, 0, 0, 0], ['Sherpur', 9, 5, 0, 0, 0, 0],
    ['Bogura', 2, 11, 6, 0, 0, 0], ['Chapainawabganj', 36, 36, 36, 0, 0, 0], ['Joypurhat', 3, 3, 1, 0, 0, 0], ['Naogaon', 12, 10, 2, 0, 0, 0], ['Natore', 17, 7, 2, 0, 0, 0], ['Pabna', 20, 20, 16, 0, 0, 0], ['Rajshahi', 154, 19, 17, 1, 0, 0], ['Sirajganj', 13, 13, 9, 0, 13, 0],
    ['Dinajpur', 0, 0, 0, 0, 0, 0], ['Gaibandha', 2, 1, 2, 0, 0, 0], ['Kurigram', 0, 1, 2, 0, 0, 0], ['Lalmonirhat', 3, 0, 1, 0, 0, 0], ['Nilphamari', 5, 3, 1, 0, 0, 0], ['Panchagarh', 0, 0, 0, 0, 0, 0], ['Rangpur', 4, 0, 0, 0, 0, 0], ['Thakurgaon', 3, 3, 7, 0, 0, 0],
    ['Habiganj', 1, 1, 0, 0, 0, 0], ['Moulvibazar', 16, 13, 9, 0, 0, 0], ['Sunamganj', 15, 14, 2, 0, 0, 0], ['Sylhet', 12, 6, 15, 0, 0, 0]
  ],
  '2026-04-13': [
    ['Barguna', 16, 12, 3, 0, 0, 0], ['Barisal', 1, 1, 0, 0, 0, 0], ['Bhola', 5, 5, 5, 0, 0, 0], ['Jhalokati', 5, 2, 0, 0, 0, 0], ['Patuakhali', 18, 18, 17, 0, 0, 0], ['Pirojpur', 19, 4, 1, 0, 0, 0],
    ['Bandarban', 6, 6, 0, 0, 0, 0], ['Brahmanbaria', 4, 4, 12, 0, 2, 0], ['Chandpur', 10, 10, 15, 0, 0, 0], ['Chattogram', 19, 19, 15, 0, 0, 0], ['Cox\'s Bazar', 34, 34, 21, 0, 0, 0], ['Cumilla', 45, 25, 18, 0, 0, 0], ['Feni', 4, 4, 3, 0, 0, 0], ['Khagrachhari', 0, 0, 0, 0, 0, 0], ['Lakshmipur', 10, 10, 12, 0, 0, 0], ['Noakhali', 9, 9, 7, 0, 0, 0], ['Rangamati', 0, 0, 0, 0, 0, 0],
    ['Dhaka', 439, 148, 167, 4, 76, 2], ['Faridpur', 23, 15, 16, 0, 0, 0], ['Gazipur', 17, 10, 5, 0, 0, 0], ['Gopalganj', 17, 12, 17, 0, 0, 0], ['Kishoreganj', 33, 33, 43, 0, 0, 0], ['Madaripur', 7, 7, 6, 0, 0, 0], ['Manikganj', 17, 13, 15, 0, 0, 0], ['Munshiganj', 6, 4, 4, 0, 0, 0], ['Narayanganj', 2, 2, 0, 0, 0, 0], ['Narsingdi', 27, 13, 18, 0, 0, 0], ['Rajbari', 9, 3, 1, 0, 0, 0], ['Shariatpur', 2, 2, 3, 0, 0, 0], ['Tangail', 16, 12, 10, 0, 0, 0],
    ['Bagerhat', 20, 2, 0, 0, 0, 0], ['Chuadanga', 8, 8, 6, 0, 0, 0], ['Jashore', 14, 10, 12, 0, 0, 0], ['Jhenaidah', 6, 6, 0, 0, 0, 0], ['Khulna', 10, 10, 10, 0, 0, 0], ['Kushtia', 56, 56, 54, 0, 0, 0], ['Magura', 13, 11, 11, 0, 0, 0], ['Meherpur', 4, 3, 0, 0, 0, 0], ['Narail', 5, 5, 4, 0, 0, 0], ['Satkhira', 7, 7, 6, 0, 0, 0],
    ['Jamalpur', 5, 5, 4, 0, 0, 0], ['Mymensingh', 6, 0, 0, 0, 0, 0], ['Netrokona', 17, 11, 4, 0, 0, 0], ['Sherpur', 1, 1, 3, 0, 0, 0],
    ['Bogura', 39, 11, 21, 0, 0, 0], ['Chapainawabganj', 52, 52, 33, 0, 0, 0], ['Joypurhat', 10, 6, 9, 0, 0, 0], ['Naogaon', 9, 5, 4, 0, 0, 0], ['Natore', 15, 5, 6, 0, 0, 0], ['Pabna', 16, 16, 32, 0, 0, 0], ['Rajshahi', 153, 9, 11, 1, 0, 0], ['Sirajganj', 4, 4, 7, 0, 4, 0],
    ['Dinajpur', 10, 0, 5, 0, 0, 0], ['Gaibandha', 8, 6, 0, 0, 0, 0], ['Kurigram', 0, 0, 1, 0, 0, 0], ['Lalmonirhat', 5, 3, 2, 0, 0, 0], ['Nilphamari', 1, 1, 3, 0, 0, 0], ['Panchagarh', 1, 0, 0, 0, 0, 0], ['Rangpur', 0, 0, 0, 0, 0, 0], ['Thakurgaon', 1, 1, 7, 0, 0, 0],
    ['Habiganj', 7, 2, 5, 0, 0, 0], ['Moulvibazar', 9, 9, 9, 0, 0, 0], ['Sunamganj', 16, 7, 3, 0, 0, 0], ['Sylhet', 23, 20, 7, 0, 0, 0]
  ],
  '2026-04-12': [
    ['Barguna', 10, 8, 13, 0, 0, 0], ['Barisal', 8, 3, 4, 0, 0, 0], ['Bhola', 11, 11, 2, 0, 0, 0], ['Jhalokati', 8, 1, 5, 0, 0, 0], ['Patuakhali', 23, 23, 5, 0, 0, 0], ['Pirojpur', 16, 9, 8, 0, 4, 0],
    ['Bandarban', 4, 0, 0, 0, 0, 0], ['Brahmanbaria', 4, 4, 6, 0, 0, 0], ['Chandpur', 11, 6, 7, 0, 0, 0], ['Chattogram', 23, 21, 24, 0, 1, 0], ['Cox\'s Bazar', 29, 29, 36, 0, 0, 0], ['Cumilla', 41, 21, 16, 0, 0, 0], ['Feni', 5, 3, 7, 0, 0, 0], ['Khagrachhari', 0, 0, 0, 0, 0, 0], ['Lakshmipur', 11, 11, 17, 0, 0, 0], ['Noakhali', 17, 17, 7, 0, 0, 0], ['Rangamati', 0, 0, 0, 0, 0, 0],
    ['Dhaka', 412, 238, 182, 5, 117, 4], ['Faridpur', 25, 22, 15, 0, 0, 0], ['Gazipur', 19, 19, 22, 0, 4, 0], ['Gopalganj', 15, 10, 15, 0, 0, 0], ['Kishoreganj', 16, 15, 7, 0, 0, 0], ['Madaripur', 12, 10, 19, 0, 2, 0], ['Manikganj', 9, 6, 2, 0, 0, 0], ['Munshiganj', 6, 6, 11, 0, 0, 0], ['Narayanganj', 0, 0, 0, 0, 0, 0], ['Narsingdi', 13, 13, 8, 0, 0, 0], ['Rajbari', 11, 1, 1, 0, 0, 0], ['Shariatpur', 8, 3, 7, 0, 0, 0], ['Tangail', 34, 14, 23, 0, 0, 0],
    ['Bagerhat', 5, 5, 3, 0, 0, 0], ['Chuadanga', 3, 3, 1, 0, 0, 0], ['Jashore', 18, 18, 10, 0, 0, 0], ['Jhenaidah', 12, 12, 7, 0, 0, 0], ['Khulna', 7, 7, 3, 1, 0, 0], ['Kushtia', 23, 23, 4, 0, 0, 0], ['Magura', 10, 7, 2, 0, 0, 0], ['Meherpur', 13, 4, 3, 0, 0, 0], ['Narail', 4, 4, 1, 0, 0, 0], ['Satkhira', 7, 7, 3, 0, 0, 0],
    ['Jamalpur', 8, 8, 5, 0, 0, 0], ['Mymensingh', 11, 1, 2, 0, 0, 0], ['Netrokona', 12, 12, 3, 0, 0, 0], ['Sherpur', 3, 1, 0, 0, 0, 0],
    ['Bogura', 4, 5, 5, 0, 0, 0], ['Chapainawabganj', 16, 16, 27, 0, 3, 0], ['Joypurhat', 2, 2, 6, 0, 0, 0], ['Naogaon', 16, 7, 9, 0, 0, 0], ['Natore', 13, 1, 4, 0, 0, 0], ['Pabna', 16, 16, 1, 0, 0, 0], ['Rajshahi', 157, 15, 13, 0, 1, 0], ['Sirajganj', 17, 17, 12, 0, 17, 0],
    ['Dinajpur', 17, 0, 1, 0, 0, 0], ['Gaibandha', 4, 2, 1, 0, 0, 0], ['Kurigram', 0, 0, 1, 0, 0, 0], ['Lalmonirhat', 1, 1, 4, 0, 0, 0], ['Nilphamari', 5, 0, 0, 0, 0, 0], ['Panchagarh', 1, 0, 0, 0, 0, 0], ['Rangpur', 3, 0, 0, 0, 0, 0], ['Thakurgaon', 10, 8, 2, 0, 0, 0],
    ['Habiganj', 3, 3, 6, 0, 0, 0], ['Moulvibazar', 7, 4, 2, 0, 1, 0], ['Sunamganj', 16, 13, 16, 0, 0, 0], ['Sylhet', 23, 16, 8, 0, 0, 0]
  ],
  '2026-04-11': [
    ['Barguna', 20, 3, 1, 0, 0, 0], ['Barisal', 2, 3, 4, 0, 0, 0], ['Bhola', 5, 5, 5, 0, 0, 0], ['Jhalokati', 0, 0, 0, 0, 0, 0], ['Patuakhali', 11, 11, 15, 0, 0, 0], ['Pirojpur', 0, 0, 3, 0, 0, 0],
    ['Bandarban', 0, 0, 0, 0, 0, 0], ['Brahmanbaria', 12, 12, 0, 0, 0, 0], ['Chandpur', 0, 0, 0, 0, 0, 0], ['Chattogram', 15, 15, 21, 0, 8, 0], ['Cox\'s Bazar', 34, 34, 32, 0, 0, 0], ['Cumilla', 23, 23, 12, 0, 0, 0], ['Feni', 1, 4, 1, 0, 0, 0], ['Khagrachhari', 0, 0, 0, 0, 0, 0], ['Lakshmipur', 9, 9, 1, 0, 0, 0], ['Noakhali', 2, 2, 1, 0, 0, 0], ['Rangamati', 4, 0, 0, 0, 0, 0],
    ['Dhaka', 304, 157, 120, 0, 69, 1], ['Faridpur', 10, 10, 9, 0, 0, 0], ['Gazipur', 14, 14, 1, 0, 0, 0], ['Gopalganj', 18, 9, 4, 0, 0, 0], ['Kishoreganj', 15, 18, 22, 0, 0, 0], ['Madaripur', 7, 7, 6, 0, 0, 0], ['Manikganj', 14, 14, 8, 0, 0, 0], ['Munshiganj', 6, 6, 5, 0, 0, 0], ['Narayanganj', 0, 0, 0, 0, 0, 0], ['Narsingdi', 6, 6, 5, 0, 0, 0], ['Rajbari', 5, 3, 3, 0, 0, 0], ['Shariatpur', 9, 9, 0, 0, 0, 0], ['Tangail', 37, 15, 13, 0, 0, 0],
    ['Bagerhat', 0, 0, 0, 0, 0, 0], ['Chuadanga', 2, 2, 6, 0, 0, 0], ['Jashore', 2, 0, 4, 0, 0, 0], ['Jhenaidah', 0, 0, 0, 0, 0, 0], ['Khulna', 9, 9, 8, 0, 0, 0], ['Kushtia', 26, 26, 25, 0, 0, 0], ['Magura', 5, 5, 10, 0, 0, 0], ['Meherpur', 3, 3, 3, 0, 0, 0], ['Narail', 3, 3, 0, 0, 0, 0], ['Satkhira', 0, 0, 1, 0, 0, 0],
    ['Jamalpur', 0, 0, 0, 0, 0, 0], ['Mymensingh', 0, 0, 0, 0, 0, 0], ['Netrokona', 4, 4, 0, 0, 0, 0], ['Sherpur', 1, 0, 0, 0, 0, 0],
    ['Bogura', 0, 6, 1, 0, 0, 0], ['Chapainawabganj', 29, 29, 16, 0, 0, 0], ['Joypurhat', 2, 2, 0, 0, 0, 0], ['Naogaon', 4, 4, 0, 0, 0, 0], ['Natore', 3, 1, 3, 0, 0, 0], ['Pabna', 18, 18, 17, 0, 0, 0], ['Rajshahi', 154, 27, 9, 0, 0, 0], ['Sirajganj', 2, 2, 3, 0, 2, 0],
    ['Dinajpur', 10, 0, 0, 0, 0, 0], ['Gaibandha', 3, 1, 0, 0, 0, 0], ['Kurigram', 0, 0, 2, 0, 0, 0], ['Lalmonirhat', 1, 1, 0, 0, 0, 0], ['Nilphamari', 2, 2, 2, 0, 0, 0], ['Panchagarh', 0, 0, 0, 0, 0, 0], ['Rangpur', 0, 0, 0, 0, 0, 0], ['Thakurgaon', 2, 0, 0, 0, 0, 0],
    ['Habiganj', 2, 2, 5, 0, 0, 0], ['Moulvibazar', 5, 5, 0, 0, 1, 0], ['Sunamganj', 5, 5, 1, 0, 0, 0], ['Sylhet', 8, 7, 5, 1, 0, 0]
  ],
  '2026-04-10': [
    ['Barguna', 20, 2, 6, 0, 0, 0], ['Barisal', 8, 4, 8, 0, 1, 0], ['Bhola', 0, 0, 5, 0, 0, 0], ['Jhalokati', 14, 0, 4, 0, 0, 0], ['Patuakhali', 46, 22, 26, 0, 0, 0], ['Pirojpur', 8, 4, 3, 0, 0, 0],
    ['Bandarban', 1, 0, 0, 0, 0, 0], ['Brahmanbaria', 8, 8, 3, 0, 0, 0], ['Chandpur', 34, 13, 7, 0, 0, 0], ['Chattogram', 19, 16, 23, 0, 0, 0], ['Cox\'s Bazar', 38, 32, 33, 0, 0, 0], ['Cumilla', 50, 26, 214, 0, 0, 0], ['Feni', 12, 1, 6, 0, 0, 0], ['Khagrachhari', 0, 0, 1, 0, 0, 0], ['Lakshmipur', 7, 7, 8, 0, 0, 0], ['Noakhali', 17, 10, 10, 0, 0, 0], ['Rangamati', 0, 0, 0, 0, 0, 0],
    ['Dhaka', 326, 177, 129, 0, 125, 0], ['Faridpur', 15, 17, 11, 2, 0, 0], ['Gazipur', 9, 9, 16, 0, 10, 0], ['Gopalganj', 12, 7, 13, 0, 2, 0], ['Kishoreganj', 8, 5, 1, 0, 1, 0], ['Madaripur', 15, 13, 3, 0, 0, 0], ['Manikganj', 13, 12, 6, 0, 0, 0], ['Munshiganj', 7, 0, 3, 0, 0, 0], ['Narayanganj', 5, 4, 0, 0, 0, 0], ['Narsingdi', 11, 11, 11, 0, 0, 0], ['Rajbari', 12, 1, 5, 0, 0, 0], ['Shariatpur', 11, 5, 10, 0, 1, 0], ['Tangail', 18, 26, 11, 0, 1, 0],
    ['Bagerhat', 1, 1, 0, 0, 0, 0], ['Chuadanga', 4, 4, 3, 0, 0, 0], ['Jashore', 26, 16, 22, 0, 1, 0], ['Jhenaidah', 3, 3, 0, 0, 8, 0], ['Khulna', 6, 6, 1, 1, 0, 0], ['Kushtia', 19, 19, 12, 1, 0, 0], ['Magura', 11, 7, 9, 0, 1, 0], ['Meherpur', 10, 2, 5, 0, 0, 0], ['Narail', 8, 2, 6, 0, 0, 0], ['Satkhira', 2, 2, 9, 0, 0, 0],
    ['Jamalpur', 2, 2, 10, 0, 0, 0], ['Mymensingh', 8, 0, 0, 0, 0, 0], ['Netrokona', 13, 8, 8, 0, 0, 0], ['Sherpur', 4, 1, 1, 0, 0, 0],
    ['Bogura', 4, 2, 2, 0, 0, 0], ['Chapainawabganj', 14, 14, 27, 0, 0, 0], ['Joypurhat', 12, 7, 5, 0, 0, 0], ['Naogaon', 20, 6, 11, 0, 0, 0], ['Natore', 9, 7, 9, 0, 0, 0], ['Pabna', 21, 21, 19, 0, 0, 0], ['Rajshahi', 136, 29, 25, 0, 2, 0], ['Sirajganj', 14, 14, 14, 0, 14, 0],
    ['Dinajpur', 0, 0, 0, 0, 0, 0], ['Gaibandha', 2, 2, 0, 0, 0, 0], ['Kurigram', 4, 3, 2, 0, 0, 0], ['Lalmonirhat', 3, 3, 3, 0, 0, 0], ['Nilphamari', 3, 3, 2, 0, 0, 0], ['Panchagarh', 4, 0, 0, 0, 0, 0], ['Rangpur', 6, 0, 0, 0, 0, 0], ['Thakurgaon', 4, 1, 2, 0, 0, 0],
    ['Habiganj', 13, 8, 7, 0, 1, 0], ['Moulvibazar', 12, 8, 2, 0, 0, 0], ['Sunamganj', 19, 16, 8, 0, 0, 0], ['Sylhet', 16, 10, 8, 0, 0, 0]
  ],
  '2026-04-09': [
    ['Barguna', 24, 6, 7, 0, 0, 0], ['Barisal', 4, 0, 3, 0, 0, 0], ['Bhola', 9, 9, 7, 0, 0, 0], ['Jhalokati', 4, 4, 2, 0, 0, 0], ['Patuakhali', 21, 19, 14, 0, 0, 0], ['Pirojpur', 13, 5, 1, 0, 0, 0],
    ['Bandarban', 4, 4, 1, 0, 0, 0], ['Brahmanbaria', 6, 6, 5, 0, 0, 0], ['Chandpur', 25, 14, 7, 0, 1, 0], ['Chattogram', 20, 21, 13, 0, 4, 0], ['Cox\'s Bazar', 39, 38, 24, 0, 0, 0], ['Cumilla', 32, 14, 15, 0, 0, 0], ['Feni', 10, 8, 9, 0, 0, 0], ['Khagrachhari', 1, 1, 1, 0, 0, 0], ['Lakshmipur', 17, 15, 7, 0, 0, 0], ['Noakhali', 5, 5, 3, 0, 0, 0], ['Rangamati', 0, 0, 0, 0, 0, 0],
    ['Dhaka', 360, 186, 140, 1, 145, 1], ['Faridpur', 17, 13, 21, 0, 0, 0], ['Gazipur', 10, 10, 16, 0, 1, 0], ['Gopalganj', 13, 7, 11, 0, 0, 0], ['Kishoreganj', 25, 2, 4, 0, 1, 0], ['Madaripur', 9, 6, 3, 0, 2, 0], ['Manikganj', 8, 6, 8, 0, 0, 0], ['Munshiganj', 10, 3, 3, 0, 0, 0], ['Narayanganj', 8, 4, 0, 0, 0, 0], ['Narsingdi', 16, 8, 11, 0, 0, 0], ['Rajbari', 7, 1, 2, 0, 0, 0], ['Shariatpur', 9, 4, 2, 0, 0, 0], ['Tangail', 12, 11, 16, 0, 1, 0],
    ['Bagerhat', 2, 2, 0, 0, 0, 0], ['Chuadanga', 2, 2, 2, 0, 0, 0], ['Jashore', 10, 3, 5, 0, 0, 0], ['Jhenaidah', 4, 4, 3, 0, 0, 0], ['Khulna', 6, 6, 2, 0, 0, 0], ['Kushtia', 25, 25, 29, 0, 0, 0], ['Magura', 10, 10, 8, 0, 0, 0], ['Meherpur', 13, 2, 3, 0, 0, 0], ['Narail', 7, 0, 1, 0, 0, 0], ['Satkhira', 5, 5, 7, 0, 0, 0],
    ['Jamalpur', 4, 4, 5, 0, 0, 0], ['Mymensingh', 5, 0, 0, 0, 0, 0], ['Netrokona', 13, 9, 5, 0, 0, 0], ['Sherpur', 7, 3, 1, 0, 0, 0],
    ['Bogura', 10, 8, 6, 0, 0, 0], ['Chapainawabganj', 41, 41, 19, 0, 0, 0], ['Joypurhat', 6, 1, 4, 0, 0, 0], ['Naogaon', 11, 14, 9, 0, 0, 0], ['Natore', 0, 0, 0, 0, 0, 0], ['Pabna', 19, 19, 20, 0, 0, 0], ['Rajshahi', 132, 27, 24, 4, 479, 0], ['Sirajganj', 6, 6, 7, 0, 6, 0],
    ['Dinajpur', 18, 7, 6, 0, 0, 0], ['Gaibandha', 4, 2, 0, 0, 0, 0], ['Kurigram', 0, 0, 0, 0, 0, 0], ['Lalmonirhat', 6, 2, 3, 0, 0, 0], ['Nilphamari', 9, 5, 4, 0, 0, 0], ['Panchagarh', 4, 0, 0, 0, 0, 0], ['Rangpur', 4, 0, 0, 0, 0, 0], ['Thakurgaon', 16, 1, 0, 0, 0, 0],
    ['Habiganj', 5, 5, 5, 0, 0, 0], ['Moulvibazar', 12, 10, 0, 0, 2, 0], ['Sunamganj', 19, 14, 15, 1, 0, 0], ['Sylhet', 14, 7, 11, 0, 0, 0]
  ],
  '2026-04-08': [
    ['Barguna', 24, 3, 15, 0, 0, 0], ['Barisal', 7, 4, 11, 0, 0, 0], ['Bhola', 2, 2, 0, 0, 0, 0], ['Jhalokati', 5, 2, 0, 0, 0, 0], ['Patuakhali', 16, 12, 16, 0, 0, 0], ['Pirojpur', 17, 2, 1, 0, 0, 0],
    ['Bandarban', 0, 0, 3, 0, 0, 0], ['Brahmanbaria', 5, 5, 9, 0, 2, 0], ['Chandpur', 13, 12, 8, 0, 17, 0], ['Chattogram', 16, 16, 5, 0, 4, 0], ['Cox\'s Bazar', 34, 31, 28, 0, 0, 0], ['Cumilla', 45, 31, 15, 0, 0, 0], ['Feni', 6, 6, 2, 0, 0, 0], ['Khagrachhari', 0, 0, 0, 0, 0, 0], ['Lakshmipur', 8, 8, 4, 0, 1, 0], ['Noakhali', 17, 17, 10, 0, 0, 0], ['Rangamati', 1, 0, 0, 0, 0, 0],
    ['Dhaka', 319, 161, 162, 5, 119, 0], ['Faridpur', 17, 17, 15, 0, 0, 0], ['Gazipur', 16, 16, 10, 0, 13, 0], ['Gopalganj', 21, 25, 17, 0, 0, 0], ['Kishoreganj', 54, 6, 7, 0, 0, 0], ['Madaripur', 10, 8, 2, 0, 0, 0], ['Manikganj', 12, 5, 6, 0, 0, 0], ['Munshiganj', 7, 3, 3, 0, 2, 0], ['Narayanganj', 6, 0, 0, 0, 0, 0], ['Narsingdi', 13, 13, 8, 0, 0, 0], ['Rajbari', 14, 4, 2, 0, 1, 0], ['Shariatpur', 15, 6, 2, 0, 0, 0], ['Tangail', 1, 21, 9, 1, 0, 0],
    ['Bagerhat', 20, 2, 0, 0, 0, 0], ['Chuadanga', 4, 4, 2, 0, 0, 0], ['Jashore', 28, 16, 5, 0, 0, 0], ['Jhenaidah', 4, 4, 13, 0, 1, 0], ['Khulna', 4, 4, 0, 0, 0, 0], ['Kushtia', 23, 23, 44, 1, 2, 0], ['Magura', 15, 7, 4, 0, 0, 0], ['Meherpur', 7, 3, 2, 0, 0, 0], ['Narail', 8, 4, 4, 0, 1, 0], ['Satkhira', 5, 5, 10, 0, 0, 0],
    ['Jamalpur', 3, 3, 5, 0, 0, 0], ['Mymensingh', 4, 0, 0, 0, 0, 0], ['Netrokona', 16, 7, 6, 0, 3, 0], ['Sherpur', 5, 3, 0, 0, 0, 0],
    ['Bogura', 25, 10, 8, 0, 3, 0], ['Chapainawabganj', 40, 40, 28, 0, 0, 0], ['Joypurhat', 8, 1, 2, 0, 0, 0], ['Naogaon', 12, 7, 7, 0, 2, 0], ['Natore', 6, 6, 7, 0, 0, 0], ['Pabna', 18, 18, 13, 0, 0, 0], ['Rajshahi', 140, 23, 10, 3, 0, 0], ['Sirajganj', 24, 14, 8, 0, 14, 0],
    ['Dinajpur', 22, 10, 5, 0, 0, 0], ['Gaibandha', 4, 0, 1, 0, 0, 0], ['Kurigram', 5, 2, 3, 0, 0, 0], ['Lalmonirhat', 3, 3, 4, 0, 0, 0], ['Nilphamari', 6, 2, 4, 0, 3, 0], ['Panchagarh', 2, 0, 0, 0, 0, 0], ['Rangpur', 5, 0, 0, 1, 0, 0], ['Thakurgaon', 15, 3, 3, 0, 0, 0],
    ['Habiganj', 4, 4, 7, 0, 0, 0], ['Moulvibazar', 10, 10, 6, 0, 0, 0], ['Sunamganj', 15, 10, 9, 0, 0, 0], ['Sylhet', 17, 9, 6, 0, 0, 0]
  ],
  '2026-04-07': [
    ['Barguna', 37, 7, 5, 0, 3, 0], ['Barisal', 11, 4, 2, 0, 0, 0], ['Bhola', 7, 7, 3, 0, 4, 0], ['Jhalokati', 4, 2, 0, 0, 0, 0], ['Patuakhali', 25, 25, 16, 0, 0, 0], ['Pirojpur', 12, 5, 5, 0, 2, 0],
    ['Bandarban', 3, 0, 0, 0, 0, 0], ['Brahmanbaria', 6, 6, 0, 0, 3, 0], ['Chandpur', 11, 11, 12, 0, 0, 0], ['Chattogram', 27, 14, 32, 0, 4, 0], ['Cox\'s Bazar', 34, 31, 22, 0, 0, 0], ['Cumilla', 58, 33, 18, 0, 0, 0], ['Feni', 7, 2, 5, 0, 1, 0], ['Khagrachhari', 0, 0, 0, 0, 0, 0], ['Lakshmipur', 10, 9, 6, 0, 0, 0], ['Noakhali', 19, 19, 3, 0, 0, 0], ['Rangamati', 0, 1, 0, 0, 0, 0],
    ['Dhaka', 332, 162, 160, 6, 176, 1], ['Faridpur', 28, 16, 7, 0, 0, 0], ['Gazipur', 8, 8, 12, 0, 13, 0], ['Gopalganj', 28, 19, 14, 1, 1, 0], ['Kishoreganj', 29, 2, 4, 0, 0, 0], ['Madaripur', 11, 9, 13, 1, 2, 0], ['Manikganj', 14, 12, 4, 0, 0, 0], ['Munshiganj', 6, 5, 3, 0, 4, 0], ['Narayanganj', 6, 3, 0, 0, 0, 0], ['Narsingdi', 11, 6, 9, 0, 0, 0], ['Rajbari', 4, 2, 3, 0, 0, 0], ['Shariatpur', 8, 7, 2, 0, 1, 0], ['Tangail', 20, 12, 16, 0, 2, 0],
    ['Bagerhat', 2, 2, 0, 0, 0, 0], ['Chuadanga', 0, 0, 0, 0, 0, 0], ['Jashore', 14, 3, 17, 0, 0, 0], ['Jhenaidah', 2, 1, 3, 0, 3, 0], ['Khulna', 3, 3, 4, 0, 0, 0], ['Kushtia', 27, 27, 27, 0, 0, 0], ['Magura', 13, 10, 4, 0, 0, 0], ['Meherpur', 30, 10, 4, 0, 0, 0], ['Narail', 3, 2, 0, 0, 0, 0], ['Satkhira', 7, 7, 4, 0, 0, 0],
    ['Jamalpur', 2, 2, 5, 0, 0, 0], ['Mymensingh', 7, 1, 0, 0, 2, 0], ['Netrokona', 26, 8, 5, 0, 0, 0], ['Sherpur', 11, 4, 0, 0, 0, 0],
    ['Bogura', 15, 6, 4, 0, 0, 0], ['Chapainawabganj', 26, 26, 22, 0, 0, 0], ['Joypurhat', 6, 4, 1, 0, 1, 0], ['Naogaon', 18, 5, 2, 0, 0, 0], ['Natore', 13, 10, 6, 0, 0, 0], ['Pabna', 20, 20, 23, 0, 6, 0], ['Rajshahi', 124, 18, 32, 1, 2, 0], ['Sirajganj', 3, 3, 2, 0, 3, 0],
    ['Dinajpur', 19, 8, 12, 0, 4, 0], ['Gaibandha', 2, 1, 0, 0, 0, 0], ['Kurigram', 5, 3, 4, 0, 0, 0], ['Lalmonirhat', 3, 2, 4, 0, 0, 0], ['Nilphamari', 16, 2, 5, 0, 0, 0], ['Panchagarh', 3, 0, 0, 0, 0, 0], ['Rangpur', 4, 0, 0, 0, 0, 0], ['Thakurgaon', 2, 1, 1, 0, 0, 0],
    ['Habiganj', 2, 1, 3, 0, 0, 0], ['Moulvibazar', 8, 5, 4, 0, 0, 0], ['Sunamganj', 17, 11, 8, 0, 0, 0], ['Sylhet', 21, 9, 15, 1, 0, 0]
  ]
};

async function main() {
  const outbreakId = 'measles-2026';
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found');

  console.log('Clearing old records...');
  await prisma.reportFieldValue.deleteMany({});
  await prisma.report.deleteMany({ where: { outbreakId } });
  await prisma.dailyReport.deleteMany({ where: { outbreakId } });

  const fields = await prisma.formField.findMany({ where: { outbreakId } });
  const fMap: any = {};
  fields.forEach(f => fMap[f.fieldKey] = f.id);

  const facilities = await prisma.facility.findMany();

  const sortedDates = Object.keys(rawData).sort();
  
  for (const dateStr of sortedDates) {
    const dayData = rawData[dateStr];
    const reportDate = new Date(dateStr);

    console.log(`\nProcessing ${dateStr} (${dayData.length} records)...`);

    const reportsToCreate = dayData.map((record: any) => {
      const [distName, susp, adm, disc, sdt, conf, cdt] = record;
      const normalizedDist = districtMap[distName.toLowerCase()] || distName;
      const facility = facilities.find(f => f.district.toLowerCase() === normalizedDist.toLowerCase());
      
      if (!facility) return null;

      return {
          outbreakId,
          facilityId: facility.id,
          userId: user.id,
          periodStart: reportDate,
          periodEnd: reportDate,
          status: ReportStatus.PUBLISHED,
          publishedAt: new Date(),
          dataSnapshot: {
            suspected24h: Number(susp),
            admitted24h: Number(adm),
            discharged24h: Number(disc),
            suspectedDeath24h: Number(sdt),
            confirmed24h: Number(conf),
            confirmedDeath24h: Number(cdt)
          },
          // Temporary property to match back field values
          _csvData: { distName, susp, adm, disc, sdt, conf, cdt, facilityId: facility.id }
      };
    }).filter(Boolean);

    // 1. Bulk Create Reports and Return IDs
    console.log(`- Creating ${reportsToCreate.length} Reports...`);
    const createdReports = await (prisma.report as any).createManyAndReturn({
      data: reportsToCreate.map((r: any) => {
          const { _csvData, ...rest } = r;
          return rest;
      })
    });

    // 2. Prepare Field Values in bulk
    const fieldValuesData: any[] = [];
    const legacyData: any[] = [];

    createdReports.forEach((report: any, idx: number) => {
      const csv = reportsToCreate[idx]._csvData;
      
      fieldValuesData.push(
        { modernReportId: report.id, formFieldId: fMap['suspected24h'], value: String(csv.susp) },
        { modernReportId: report.id, formFieldId: fMap['admitted24h'], value: String(csv.adm) },
        { modernReportId: report.id, formFieldId: fMap['discharged24h'], value: String(csv.disc) },
        { modernReportId: report.id, formFieldId: fMap['suspectedDeath24h'], value: String(csv.sdt) },
        { modernReportId: report.id, formFieldId: fMap['confirmed24h'], value: String(csv.conf) },
        { modernReportId: report.id, formFieldId: fMap['confirmedDeath24h'], value: String(csv.cdt) },
      );

      legacyData.push({
        outbreakId,
        facilityId: csv.facilityId,
        userId: user.id,
        reportingDate: reportDate,
        suspected24h: Number(csv.susp),
        admitted24h: Number(csv.adm),
        discharged24h: Number(csv.disc),
        suspectedDeath24h: Number(csv.sdt),
        confirmed24h: Number(csv.conf),
        confirmedDeath24h: Number(csv.cdt),
        published: true
      });
    });

    console.log(`- Creating ${fieldValuesData.length} Field Values...`);
    await prisma.reportFieldValue.createMany({ data: fieldValuesData });

    console.log(`- Creating ${legacyData.length} Legacy Reports...`);
    await prisma.dailyReport.createMany({ data: legacyData });
  }

  console.log('\n--- BATCH SEEDING COMPLETE ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
