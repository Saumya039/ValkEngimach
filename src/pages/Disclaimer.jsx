import React from 'react';
import { motion } from 'framer-motion';

export default function Disclaimer() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto p-8 bg-white rounded-lg shadow-md my-12"
      style={{ maxWidth: '800px', lineHeight: '1.6' }}
    >
      <h1 className="text-3xl font-bold mb-6 text-gradient">Disclaimer</h1>
      <p className="text-sm text-gray-500 mb-8">Effective Date: January 1, 2026</p>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">1. General Information</h2>
        <p className="text-gray-700">
          The information provided on this secure operational portal is for the exclusive use of Valk Engimach Private Limited employees and authorized personnel. All content, data, and materials are provided on an "as is" and "as available" basis without any warranties of any kind, either express or implied.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">2. Confidentiality and Access</h2>
        <p className="text-gray-700">
          Access to this system is highly restricted. Unauthorized access, modification, or distribution of any data within this portal is strictly prohibited and may result in disciplinary action or legal prosecution under the Information Technology Act, 2000, and other applicable Indian laws.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">3. Limitation of Liability</h2>
        <p className="text-gray-700">
          In no event shall Valk Engimach Private Limited, its directors, employees, or affiliates be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of your access to or use of this internal portal, including but not limited to data loss or system interruptions.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">4. Changes to Terms</h2>
        <p className="text-gray-700">
          Valk Engimach Private Limited reserves the right to modify or update this Disclaimer at any time without prior notice. Continued use of the portal following any changes constitutes acceptance of the revised terms.
        </p>
      </section>
      
      <div className="mt-12 text-center">
        <a href="/" className="btn btn-outline">Return to Home</a>
      </div>
    </motion.div>
  );
}
