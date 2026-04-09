import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const facilities = [
  // Dhaka - Dhaka District - Hospitals
  { facilityCode: 'BSCHILD', facilityName: 'Bangladesh Shishu (Children) Hospital & Institute', facilityType: 'Specialized Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'BSMMU', facilityName: 'BSMMU', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'CPOLICE', facilityName: 'CENTRAL POLICE HOSPITAL, DHAKA', facilityType: 'Police Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'BGBDHK', facilityName: 'Border Guard Hospital, Dhaka', facilityType: 'Border Guard Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'CMHDHK', facilityName: 'CMH Dhaka', facilityType: 'Army Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'CMHSAV', facilityName: 'CMH SAVAR', facilityType: 'Army Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Savar' },
  { facilityCode: 'GEHFUL', facilityName: 'Government Employees Hospital, Fulbaria, Dhaka', facilityType: 'District Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'DMGH', facilityName: 'DHAKA MOHANAGAR GENERAL HOSPITAL', facilityType: 'District Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'DMSSH', facilityName: 'Dhaka Mohanagar Shishu Hospital, Dhaka South City Corporation', facilityType: 'Specialized Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'BMCH', facilityName: 'Bangladesh Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'HFRCMCH', facilityName: 'Holy Family Red Crescent M.C Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'BIRDEM', facilityName: 'BIRDEM General Hospital', facilityType: 'Specialized Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'BIRDEMW', facilityName: 'BIRDEM Women & Children Hospital', facilityType: 'Specialized Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'IBNSIA', facilityName: 'Ibn Sina Medical College Hospital, Kallyanpur, Mirpur, Dhaka', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Mirpur' },
  { facilityCode: 'IBNSID', facilityName: 'Ibn Sina Hospital, Dhanmondi, Dhaka', facilityType: 'Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhanmondi' },
  { facilityCode: 'SQUARE', facilityName: 'SQUARE HOSPITALS LTD', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'COMFORT', facilityName: 'COMFORT NURSING HOME (PVT) LTD', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'SAMORITA', facilityName: 'SAMORITA HOSPITAL LIMITED', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'DELTA', facilityName: 'Delta Hospital Ltd', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'LABAID', facilityName: 'Labaid Hospital', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'CENHL', facilityName: 'Central Hospital Limited', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'HICARE', facilityName: 'Hi-Care General Hospital Ltd', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'HHOPE', facilityName: 'Health And Hope Hospital', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'GREENL', facilityName: 'Green Life Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'IBHCK', facilityName: 'ISLAMI BANK CENTRAL HOSPITAL, KAKRAIL, DHAKA', facilityType: 'Bank Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Kakrail' },
  { facilityCode: 'IBHMGD', facilityName: 'Islami Bank Hospital Mugda, Dhaka', facilityType: 'Bank Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Mugda' },
  { facilityCode: 'UNITED', facilityName: 'United Hospital', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'KHIDMA', facilityName: 'Khidmah Hospital (Pvt.) Ltd', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'SMAMCH', facilityName: 'Shaheed Monsur Ali Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'DRSIRAJ', facilityName: 'Dr.Sirajul Islam Medical College & Hospital Ltd', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'EVERCR', facilityName: 'Evercare Hospital Dhaka', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'ADDINW', facilityName: 'Ad-din Women\'s Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'UNIVMC', facilityName: 'Universal Medical College & Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'BRB', facilityName: 'BRB Hospital Ltd', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'ASGAR', facilityName: 'Asgar Ali Hospital', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'BDSPEC', facilityName: 'Bangladesh Specialized Hospital', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'UAMCH', facilityName: 'Uttara Adhunik Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Uttara' },
  { facilityCode: 'SALAUD', facilityName: 'Salauddin Specialized Hospital Ltd', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'POPULAR', facilityName: 'Popular Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'UCRESC', facilityName: 'Uttara Crescent Hospital', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Uttara' },
  { facilityCode: 'AKMMCH', facilityName: 'Anwer Khan Modern Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'MCWFH', facilityName: 'Medical College for Women & Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'MRKHAN', facilityName: 'Dr. M R Khan Shishu Hospital & ICH', facilityType: 'Specialized Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'DCIMCH', facilityName: 'Dhaka Central International Medical College & Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'AICHI', facilityName: 'Aichi Hospital LTD', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'MONOW', facilityName: 'MONOWARA HOSPITAL PVT. LTD', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'SIKDER', facilityName: 'Zainul Haque Sikder Women\'s Medical College & Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Gulshan' },
  { facilityCode: 'ENAM', facilityName: 'ENAM MEDICAL COLLEGE & HOSPITAL', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'AMZ', facilityName: 'AMZ HOSPITAL LTD', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'LIFEC', facilityName: 'LIFE & CARE HOSPITAL LTD', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'FARABI', facilityName: 'Farabi General Hospital', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'JBFH', facilityName: 'Japan Bangladesh Friendship Hospital Ltd', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'EXIM', facilityName: 'EXIM Bank Hospital', facilityType: 'Bank Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'ALMANAR', facilityName: 'Al Manar Hospital Ltd', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'DHAKAH', facilityName: 'Dhaka Health Care', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'METOR', facilityName: 'Metropolitan Medical Centre Ltd', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'SAJIDA', facilityName: 'Sajida Hospital, Keranigonj, Dhaka', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Keranigonj' },
  { facilityCode: 'ADDINM', facilityName: 'Ad-din Women\'s Medical College Hospital, Moghbazar', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Moghbazar' },
  { facilityCode: 'BIHS', facilityName: 'BIHS General Hospital', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'DCMC', facilityName: 'Dhaka Community Medical college Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'NIMC', facilityName: 'Northern International Medical College', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhanmondi' },
  { facilityCode: 'ADDINB', facilityName: 'Ad-din Barister Rafique ul-huq Hospital', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'AALOK', facilityName: 'aalok Hospital Ltd', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'CITYH', facilityName: 'CITY HOSPITAL LTD', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'CRESGL', facilityName: 'Crescent Gastroliver & General Hospital Ltd', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'IBHMIR', facilityName: 'Islami Bank Hospital Mirpur', facilityType: 'Bank Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Mirpur' },
  { facilityCode: 'MARKS', facilityName: 'MARKS Medical College and Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'MILEN', facilityName: 'Millennium Specialized Hospital Ltd', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'DHAGKH', facilityName: 'Dhanmondi General & Kidney Hospital Ltd', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhanmondi' },
  { facilityCode: 'PADMA', facilityName: 'Padma General Hospital Ltd', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'BASHM', facilityName: 'Bashundhara Ad-din Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  { facilityCode: 'ICDDRB', facilityName: 'icddr,b Hospital, Mohakhali, Dhaka', facilityType: 'Research Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Mohakhali' },
  { facilityCode: 'INSAFB', facilityName: 'Insaf Barakh Kidney & General Hospital', facilityType: 'Private Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka' },
  
  // Civil Surgeon Offices - Barisal Division
  { facilityCode: 'CSBARI', facilityName: 'Barisal Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Barisal', district: 'Barisal', upazila: 'Barisal Sadar' },
  { facilityCode: 'CSBARGU', facilityName: 'Barguna Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Barisal', district: 'Barguna', upazila: 'Barguna Sadar' },
  { facilityCode: 'CSBHOLA', facilityName: 'Bhola Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Barisal', district: 'Bhola', upazila: 'Bhola Sadar' },
  { facilityCode: 'CSJHALO', facilityName: 'Jhalokati Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Barisal', district: 'Jhalokati', upazila: 'Jhalokati Sadar' },
  { facilityCode: 'CSPATUA', facilityName: 'Patuakhali Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Barisal', district: 'Patuakhali', upazila: 'Patuakhali Sadar' },
  { facilityCode: 'CSPIROJ', facilityName: 'Pirojpur Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Barisal', district: 'Pirojpur', upazila: 'Pirojpur Sadar' },
  
  // Civil Surgeon Offices - Chattogram Division
  { facilityCode: 'CSBANDA', facilityName: 'Bandarban Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Chattogram', district: 'Bandarban', upazila: 'Bandarban Sadar' },
  { facilityCode: 'CSBRAHM', facilityName: 'Brahmanbaria Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Chattogram', district: 'Brahmanbaria', upazila: 'Brahmanbaria Sadar' },
  { facilityCode: 'CSCHAND', facilityName: 'Chandpur Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Chattogram', district: 'Chandpur', upazila: 'Chandpur Sadar' },
  { facilityCode: 'CSCHAT', facilityName: 'Chittagong Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Chattogram', district: 'Chattogram', upazila: 'Chattogram Sadar' },
  { facilityCode: 'CSCUM', facilityName: 'Comilla Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Chattogram', district: 'Comilla', upazila: 'Comilla Sadar' },
  { facilityCode: 'CSCOX', facilityName: 'Cox\'s Bazar Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Chattogram', district: 'Cox\'s Bazar', upazila: 'Cox\'s Bazar Sadar' },
  { facilityCode: 'CSFENI', facilityName: 'Feni Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Chattogram', district: 'Feni', upazila: 'Feni Sadar' },
  { facilityCode: 'CSKHAGR', facilityName: 'Khagrachhari Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Chattogram', district: 'Khagrachhari', upazila: 'Khagrachhari Sadar' },
  { facilityCode: 'CSLAKSH', facilityName: 'Lakshmipur Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Chattogram', district: 'Lakshmipur', upazila: 'Lakshmipur Sadar' },
  { facilityCode: 'CSNOAK', facilityName: 'Noakhali Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Chattogram', district: 'Noakhali', upazila: 'Noakhali Sadar' },
  { facilityCode: 'CSRANG', facilityName: 'Rangamati Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Chattogram', district: 'Rangamati', upazila: 'Rangamati Sadar' },
  
  // Dhaka Division - CS Offices
  { facilityCode: 'CSDHAK', facilityName: 'Dhaka Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka Sadar' },
  { facilityCode: 'CSFARID', facilityName: 'Faridpur Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Dhaka', district: 'Faridpur', upazila: 'Faridpur Sadar' },
  { facilityCode: 'CSGAZIP', facilityName: 'Gazipur Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Dhaka', district: 'Gazipur', upazila: 'Gazipur Sadar' },
  { facilityCode: 'CSGOPAL', facilityName: 'Gopalganj Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Dhaka', district: 'Gopalganj', upazila: 'Gopalganj Sadar' },
  { facilityCode: 'CSKISHOR', facilityName: 'Kishoreganj Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Dhaka', district: 'Kishoreganj', upazila: 'Kishoreganj Sadar' },
  { facilityCode: 'CSMADAR', facilityName: 'Madaripur Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Dhaka', district: 'Madaripur', upazila: 'Madaripur Sadar' },
  { facilityCode: 'CSMANIK', facilityName: 'Manikganj Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Dhaka', district: 'Manikganj', upazila: 'Manikganj Sadar' },
  { facilityCode: 'CSMUNSH', facilityName: 'Munshiganj Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Dhaka', district: 'Munshiganj', upazila: 'Munshiganj Sadar' },
  { facilityCode: 'CSNARA', facilityName: 'Narayanganj Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Dhaka', district: 'Narayanganj', upazila: 'Narayanganj Sadar' },
  { facilityCode: 'CSNARS', facilityName: 'Narsingdi Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Dhaka', district: 'Narsingdi', upazila: 'Narsingdi Sadar' },
  { facilityCode: 'CSRAJB', facilityName: 'Rajbari Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Dhaka', district: 'Rajbari', upazila: 'Rajbari Sadar' },
  { facilityCode: 'CSSHARI', facilityName: 'Shariatpur Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Dhaka', district: 'Shariatpur', upazila: 'Shariatpur Sadar' },
  { facilityCode: 'CSTANG', facilityName: 'Tangail Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Dhaka', district: 'Tangail', upazila: 'Tangail Sadar' },
  
  // Khulna Division - CS Offices
  { facilityCode: 'CSBAGER', facilityName: 'Bagerhat Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Khulna', district: 'Bagerhat', upazila: 'Bagerhat Sadar' },
  { facilityCode: 'CSCHUA', facilityName: 'Chuadanga Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Khulna', district: 'Chuadanga', upazila: 'Chuadanga Sadar' },
  { facilityCode: 'CSJESS', facilityName: 'Jessore Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Khulna', district: 'Jessore', upazila: 'Jessore Sadar' },
  { facilityCode: 'CSJHENA', facilityName: 'Jhenaidah Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Khulna', district: 'Jhenaidah', upazila: 'Jhenaidah Sadar' },
  { facilityCode: 'CSKHUL', facilityName: 'Khulna Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Khulna', district: 'Khulna', upazila: 'Khulna Sadar' },
  { facilityCode: 'CSKUSH', facilityName: 'Kushtia Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Khulna', district: 'Kushtia', upazila: 'Kushtia Sadar' },
  { facilityCode: 'CSMAGUR', facilityName: 'Magura Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Khulna', district: 'Magura', upazila: 'Magura Sadar' },
  { facilityCode: 'CSMEHER', facilityName: 'Meherpur Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Khulna', district: 'Meherpur', upazila: 'Meherpur Sadar' },
  { facilityCode: 'CSNARAIL', facilityName: 'Narail Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Khulna', district: 'Narail', upazila: 'Narail Sadar' },
  { facilityCode: 'CSSATK', facilityName: 'Satkhira Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Khulna', district: 'Satkhira', upazila: 'Satkhira Sadar' },
  
  // Mymensingh Division - CS Offices
  { facilityCode: 'CSJAMAL', facilityName: 'Jamalpur Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Mymensingh', district: 'Jamalpur', upazila: 'Jamalpur Sadar' },
  { facilityCode: 'CSMYMEN', facilityName: 'Mymensingh Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Mymensingh', district: 'Mymensingh', upazila: 'Mymensingh Sadar' },
  { facilityCode: 'CSNETRO', facilityName: 'Netrokona Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Mymensingh', district: 'Netrokona', upazila: 'Netrokona Sadar' },
  { facilityCode: 'CSSHERP', facilityName: 'Sherpur Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Mymensingh', district: 'Sherpur', upazila: 'Sherpur Sadar' },
  
  // Rajshahi Division - CS Offices
  { facilityCode: 'CSBOGRA', facilityName: 'Bogra Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rajshahi', district: 'Bogura', upazila: 'Bogura Sadar' },
  { facilityCode: 'CSJOYP', facilityName: 'Joypurhat Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rajshahi', district: 'Joypurhat', upazila: 'Joypurhat Sadar' },
  { facilityCode: 'CSNAO', facilityName: 'Naogaon Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rajshahi', district: 'Naogaon', upazila: 'Naogaon Sadar' },
  { facilityCode: 'CSNATOR', facilityName: 'Natore Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rajshahi', district: 'Natore', upazila: 'Natore Sadar' },
  { facilityCode: 'CSCHAPA', facilityName: 'Chapainawabganj Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rajshahi', district: 'Chapainawabganj', upazila: 'Chapainawabganj Sadar' },
  { facilityCode: 'CSPABNA', facilityName: 'Pabna Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rajshahi', district: 'Pabna', upazila: 'Pabna Sadar' },
  { facilityCode: 'CSRAJS', facilityName: 'Rajshahi Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rajshahi', district: 'Rajshahi', upazila: 'Rajshahi Sadar' },
  { facilityCode: 'CSSIRAJ', facilityName: 'Sirajganj Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rajshahi', district: 'Sirajganj', upazila: 'Sirajganj Sadar' },
  
  // Rangpur Division - CS Offices
  { facilityCode: 'CSDINAJ', facilityName: 'Dinajpur Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rangpur', district: 'Dinajpur', upazila: 'Dinajpur Sadar' },
  { facilityCode: 'CSGAI', facilityName: 'Gaibandha Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rangpur', district: 'Gaibandha', upazila: 'Gaibandha Sadar' },
  { facilityCode: 'CSKURI', facilityName: 'Kurigram Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rangpur', district: 'Kurigram', upazila: 'Kurigram Sadar' },
  { facilityCode: 'CSLALMON', facilityName: 'Lalmonirhat Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rangpur', district: 'Lalmonirhat', upazila: 'Lalmonirhat Sadar' },
  { facilityCode: 'CSNILP', facilityName: 'Nilphamari Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rangpur', district: 'Nilphamari', upazila: 'Nilphamari Sadar' },
  { facilityCode: 'CSPANCH', facilityName: 'Panchagarh Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rangpur', district: 'Panchagarh', upazila: 'Panchagarh Sadar' },
  { facilityCode: 'CSRANGR', facilityName: 'Rangpur Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rangpur', district: 'Rangpur', upazila: 'Rangpur Sadar' },
  { facilityCode: 'CSTHAKU', facilityName: 'Thakurgaon Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Rangpur', district: 'Thakurgaon', upazila: 'Thakurgaon Sadar' },
  
  // Sylhet Division - CS Offices
  { facilityCode: 'CSHABI', facilityName: 'Habiganj Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Sylhet', district: 'Habiganj', upazila: 'Habiganj Sadar' },
  { facilityCode: 'CSMOULV', facilityName: 'Moulvibazar Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Sylhet', district: 'Moulvibazar', upazila: 'Moulvibazar Sadar' },
  { facilityCode: 'CSSUNA', facilityName: 'Sunamganj Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Sylhet', district: 'Sunamganj', upazila: 'Sunamganj Sadar' },
  { facilityCode: 'CSSYLH', facilityName: 'Sylhet Civil Surgeon Office', facilityType: 'Civil Surgeon Office', division: 'Sylhet', district: 'Sylhet', upazila: 'Sylhet Sadar' },
]

async function main() {
  console.log('Clearing existing data...')
  await prisma.dailyReport.deleteMany()
  await prisma.user.deleteMany()
  await prisma.facility.deleteMany()
  console.log('Deleted all data')

  console.log('Seeding facilities...')
  for (const f of facilities) {
    await prisma.facility.create({ data: f })
  }
  console.log(`Seeded ${facilities.length} facilities`)

  console.log('Seeding admin user...')
  const adminFac = await prisma.facility.findFirst({ where: { division: 'Dhaka' } })
  const adminPassword = await bcrypt.hash('admin@321', 10)
  
  if (adminFac) {
    await prisma.user.create({
      data: {
        email: 'admin@monitor.org',
        password: adminPassword,
        name: 'Admin User',
        nameNormalized: 'admin user',
        facility: { connect: { id: adminFac.id } },
        role: 'ADMIN',
        isActive: true,
      }
    })
  }
  console.log('Seeded admin user')

  console.log('Seeding settings...')
  await prisma.settings.create({
    data: {
      cutoffHour: 14,
      cutoffMinute: 0,
      editDeadlineHour: 10,
      editDeadlineMinute: 0,
    }
  })
  console.log('Seeded settings')

  console.log('\nSeed complete!')
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })