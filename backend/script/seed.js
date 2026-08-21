import mongoose from "mongoose";
import dotenv from "dotenv";
import CampusSecurity from "../src/models/CampusSecurity.js";
import EmergencyDirectory from "../src/models/EmergencyDirectory.js";

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    console.log(
      "🔎 DB:",
      mongoose.connection.name,
      "| host:",
      mongoose.connection.host,
    );

    // Clear existing data
    await CampusSecurity.deleteMany({});
    await EmergencyDirectory.deleteMany({});
    console.log("🧹 Cleared existing data");

    // Seed Campus Security for Each University
    const securityContacts = [
      // ---------- UNILAG Security ----------
      {
        name: "UNILAG Security Headquarters",
        phoneNumber: "+2348093541837",
        email: "acientguru@gmail.com",
        location: "Senate Building, University of Lagos, Akoka",
        coordinates: {
          latitude: 6.5178,
          longitude: 3.3959,
        },
        universityAcronym: "UNILAG",
        isPrimary: true,
        description: "Main Security Office - 24/7 Campus Security",
        operatingHours: "24/7",
      },
      {
        name: "UNILAG Gate A Security Post",
        phoneNumber: "+2348182844317",
        email: "pjonyinyechi77@gmail.com",
        location: "Main Gate A, University of Lagos, Akoka",
        coordinates: {
          latitude: 6.5172,
          longitude: 3.3952,
        },
        universityAcronym: "UNILAG",
        isPrimary: false,
        description: "Main Entrance Security - 24/7 Access Control",
        operatingHours: "24/7",
      },
      {
        name: "UNILAG Hostel Security",
        phoneNumber: "+2348034567892",
        email: "onyijohn556@gmail.com",
        location: "Student Hostel Complex, University of Lagos",
        coordinates: {
          latitude: 6.518,
          longitude: 3.396,
        },
        universityAcronym: "UNILAG",
        isPrimary: false,
        description: "Hostel Security - Student Safety & Welfare",
        operatingHours: "24/7",
      },

      // ---------- UI Security ----------
      {
        name: "UI Security Department",
        phoneNumber: "+2348034567893",
        email: "thanksayo29@gmail.com",
        location: "Administrative Building, University of Ibadan",
        coordinates: {
          latitude: 7.4478,
          longitude: 3.8986,
        },
        universityAcronym: "UI",
        isPrimary: true,
        description: "Main Security Office - 24/7 Campus Security",
        operatingHours: "24/7",
      },
      {
        name: "UI Gate Security",
        phoneNumber: "+2348034567894",
        email: "preshjohn07@gmail.com",
        location: "Main Gate, University of Ibadan",
        coordinates: {
          latitude: 7.4472,
          longitude: 3.898,
        },
        universityAcronym: "UI",
        isPrimary: false,
        description: "Main Entrance Security - 24/7 Access Control",
        operatingHours: "24/7",
      },
      {
        name: "UI Halls of Residence Security",
        phoneNumber: "+2348034567895",
        email: "ephraimnyikwagh@gmail.com",
        location: "Halls of Residence, University of Ibadan",
        coordinates: {
          latitude: 7.4475,
          longitude: 3.8983,
        },
        universityAcronym: "UI",
        isPrimary: false,
        description: "Halls of Residence Security - Student Welfare",
        operatingHours: "24/7",
      },

      // ---------- MIVA (MIVA University) Security ----------
      {
        name: "MIVA Security Services",
        phoneNumber: "+2348034567896",
        email: "fayokebg@gmail.com",
        location: "Security Building, MIVA University, Canaan Land",
        coordinates: {
          latitude: 6.6734,
          longitude: 3.1608,
        },
        universityAcronym: "CU",
        isPrimary: true,
        description: "Main Security Office - 24/7 Campus Security",
        operatingHours: "24/7",
      },
      {
        name: "MIVA Gate Security",
        phoneNumber: "+2348034567897",
        email: "preciousjohn38@outlook.com",
        location: "Main Gate, MIVA University, Canaan Land",
        coordinates: {
          latitude: 6.6728,
          longitude: 3.1602,
        },
        universityAcronym: "CU",
        isPrimary: false,
        description: "Main Entrance Security - 24/7 Access Control",
        operatingHours: "24/7",
      },
      {
        name: "MIVA Student Hostel Security",
        phoneNumber: "+2348034567898",
        email: "t.agbeble8372@miva.edu.ng",
        location: "Student Hostel, MIVA University",
        coordinates: {
          latitude: 6.673,
          longitude: 3.1605,
        },
        universityAcronym: "MIVA",
        isPrimary: false,
        description: "Hostel Security - Student Safety & Welfare",
        operatingHours: "24/7",
      },
    ];

    await CampusSecurity.insertMany(securityContacts);
    console.log(
      `✅ Campus Security seeded (${securityContacts.length} contacts)`,
    );

    // 2. Seed Emergency Directory - Shared Across All Universities
    const emergencyContacts = [
      {
        type: "security",
        name: "Lagos State Emergency Agency (LASEMA)",
        phoneNumber: "767",
        email: "nou193150822@noun.edu.ng",
        address: "Lagos State Emergency Management Agency, Ikeja, Lagos",
        coordinates: {
          type: "Point",
          coordinates: [3.3956, 6.5175],
        },
        isVerified: true,
        description: "Lagos State Emergency Hotline - 24/7",
        operatingHours: "24/7",
      },

      // ---------- HOSPITALS ----------
      {
        type: "hospital",
        name: "Lagos University Teaching Hospital (LUTH)",
        phoneNumber: "+2348023456789",
        email: "nou251055933@noun.edu.ng",
        address: "1 Idi-Araba, Surulere, Lagos",
        coordinates: {
          type: "Point",
          coordinates: [3.3956, 6.5175],
        },
        isVerified: true,
        description: "Federal Government Teaching Hospital - 24/7 Emergency",
        operatingHours: "24/7",
      },

      // ---------- POLICE ----------
      {
        type: "police",
        name: "Nigeria Police Force - Oyo State Command",
        phoneNumber: "+2348034567905",
        email: "onyijohn556@gmail.com",
        address: "Police Headquarters, Ibadan",
        coordinates: {
          type: "Point",
          coordinates: [3.8983, 7.4475],
        },
        isVerified: true,
        description: "Oyo State Police Command - 24/7",
        operatingHours: "24/7",
      },

      // ---------- FIRE ----------
      {
        type: "fire",
        name: "Lagos State Fire Service",
        phoneNumber: "112",
        email: "ephraimnyikwagh@gmail.com",
        address: "Fire Service Headquarters, Ikeja, Lagos",
        coordinates: {
          type: "Point",
          coordinates: [3.3956, 6.5175],
        },
        isVerified: true,
        description: "Lagos State Fire Service - 24/7 Emergency",
        operatingHours: "24/7",
      },

      // ---------- AMBULANCE ----------
      {
        type: "ambulance",
        name: "LASAMBUS - Lagos State Ambulance Service",
        phoneNumber: "112",
        email: "lasambus@lagosstate.examples.ng",
        address: "Lagos State Ambulance Service, Ikeja",
        coordinates: {
          type: "Point",
          coordinates: [3.3956, 6.5175],
        },
        isVerified: true,
        description: "Lagos State Ambulance Services - 24/7",
        operatingHours: "24/7",
      },
    ];

    await EmergencyDirectory.insertMany(emergencyContacts);
    console.log(
      `✅ Emergency Directory seeded (${emergencyContacts.length} contacts)`,
    );

    // 3. Summary
    console.log("\n📊 Seeding Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Count security contacts per university
    const unilagCount = securityContacts.filter(
      (c) => c.universityAcronym === "UNILAG",
    ).length;
    const uiCount = securityContacts.filter(
      (c) => c.universityAcronym === "UI",
    ).length;
    const mivaCount = securityContacts.filter(
      (c) => c.universityAcronym === "MIVA",
    ).length;

    console.log("\n🏫 University Security Contacts:");
    console.log(`   🏛️  UNILAG: ${unilagCount} contacts`);
    console.log(`   🏛️  UI: ${uiCount} contacts`);
    console.log(`   🏛️  MIVA: ${mivaCount} contacts`);
    console.log(`   📦 Total: ${securityContacts.length} contacts`);

    const securityCount = emergencyContacts.filter(
      (c) => c.type === "security",
    ).length;
    const hospitalCount = emergencyContacts.filter(
      (c) => c.type === "hospital",
    ).length;
    const policeCount = emergencyContacts.filter(
      (c) => c.type === "police",
    ).length;
    const fireCount = emergencyContacts.filter((c) => c.type === "fire").length;
    const ambulanceCount = emergencyContacts.filter(
      (c) => c.type === "ambulance",
    ).length;

    console.log("\n📦 Emergency Directory:");
    console.log(`   🛡️  Security Services: ${securityCount} contacts`);
    console.log(`   🏥 Hospitals: ${hospitalCount} contacts`);
    console.log(`   👮 Police: ${policeCount} contacts`);
    console.log(`   🔥 Fire: ${fireCount} contacts`);
    console.log(`   🚑 Ambulance: ${ambulanceCount} contacts`);
    console.log(`   📦 Total: ${emergencyContacts.length} contacts`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🎉 Seeding completed successfully!");
    console.log("\n📋 Universities seeded:");
    console.log("   🏛️  UNILAG - University of Lagos");
    console.log("   🏛️  UI - University of Ibadan");
    console.log("   🏛️  MIVA- MIVA University");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

await seedData();
