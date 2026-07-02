import React from 'react';
import { motion } from 'framer-motion';

export default function PrivacyPolicy() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto p-8 bg-white rounded-lg shadow-md my-12"
      style={{ maxWidth: '800px', lineHeight: '1.6' }}
    >
      <h1 className="text-3xl font-bold mb-6 text-gradient">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Effective Date: January 1, 2026</p>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
        <p className="text-gray-700">
          Welcome to Valk Engimach Private Limited. We are committed to protecting your privacy and ensuring that your personal information is handled in a safe and responsible manner. This Privacy Policy outlines how we collect, use, and protect your data in accordance with the Information Technology Act, 2000, and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, of India.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
        <p className="text-gray-700 mb-2">We may collect the following types of information:</p>
        <ul className="list-disc pl-6 text-gray-700">
          <li><strong>Personal Information:</strong> Name, contact details, employee/worker ID, and other identifying information.</li>
          <li><strong>Operational Data:</strong> Usage logs, machinery interactions, and operational activity tracked through our secure portals.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
        <p className="text-gray-700">
          The information we collect is used strictly for internal operational purposes, including but not limited to maintaining accurate production logs, managing employee access, improving manufacturing processes, and ensuring workplace security. We do not sell or share your personal data with third-party marketers.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
        <p className="text-gray-700">
          We implement robust, industry-standard security measures, including secure servers and encrypted databases, to protect your data from unauthorized access, disclosure, alteration, or destruction. 
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">5. Contact Us</h2>
        <p className="text-gray-700">
          If you have any questions, concerns, or grievances regarding this Privacy Policy or our data handling practices, please contact our administrative department at the registered office of Valk Engimach Private Limited.
        </p>
      </section>
      
      <div className="mt-12 text-center">
        <a href="/" className="btn btn-outline">Return to Home</a>
      </div>
    </motion.div>
  );
}
