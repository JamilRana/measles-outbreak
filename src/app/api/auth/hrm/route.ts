import { NextRequest } from "next/server";
import axios from "axios";

const HRM_BASE = "https://hrm.dghs.gov.bd/api/1.0";
const CLIENT_ID = 18520;
//const API_TOKEN = process.env.HRM_API_TOKEN!;
const API_TOKEN =
  "32b0e3fff64de942449ec67b6b2244704db2282b08a5491de91dfabc7dfe9797";
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Step 1: Get access token
    const signinRes = await axios.post(
      `${HRM_BASE}/sso/signin`,
      `email=${encodeURIComponent(username)}&password=${encodeURIComponent(
        password
      )}`,
      {
        headers: {
          "X-Auth-Token": API_TOKEN,
          "client-id": CLIENT_ID,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log(API_TOKEN);

    const { access_token } = signinRes.data;
    if (!access_token) throw new Error("No access token");
    console.log(access_token);

    // Step 2: Get user info
    const userRes = await axios.get(`${HRM_BASE}/sso/token/${access_token}`, {
      headers: { "X-Auth-Token": API_TOKEN, "client-id": CLIENT_ID },
    });

    const { email, facility_id } = userRes.data;
    if (!email || !facility_id) throw new Error("Missing user data");

    // Step 3: Get facility info
    const facilityRes = await axios.get(
      `${HRM_BASE}/facilities/${facility_id}`,
      { headers: { "X-Auth-Token": API_TOKEN, "client-id": CLIENT_ID } }
    );
    console.log(facility_id);
    const facilityData = facilityRes.data.data;
    console.log(facilityData);

    return Response.json({
      email,
      facilityName: facilityData.name,
      facilityCode: facilityData.code,
      facilityType: facilityData.facility_type_name,
      division: facilityData.division_name,
      district: facilityData.district_name,
      upazila: facilityData.upazila_name,
    });
  } catch (error: any) {
    console.error("HRM Login Error:", error.response?.data || error.message);
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
