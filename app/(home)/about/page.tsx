"use client";

import { motion, Variants } from "framer-motion";
import PublicNav from "@/components/PublicNav";
import { 
  Target, 
  Eye, 
  Heart, 
  Shield, 
  Users, 
  Award,
  TrendingUp,
  Globe,
  CheckCircle,
  Zap
} from "lucide-react";
import Image from "next/image";

const AboutPage = () => {
  const fadeIn: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    },
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const scaleIn = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.5 }
    },
  };

  const values = [
    {
      icon: Shield,
      title: "Trust & Transparency",
      description: "We believe in building trust through complete transparency in every vote cast and every result published.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Heart,
      title: "Integrity First",
      description: "Our commitment to electoral integrity drives every decision we make and every feature we build.",
      color: "from-red-500 to-red-600"
    },
    {
      icon: Users,
      title: "Community Focused",
      description: "We serve communities across Africa, ensuring every voice is heard and every vote counts.",
      color: "from-green-500 to-green-600"
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "We continuously innovate to make voting more accessible, secure, and efficient for everyone.",
      color: "from-yellow-500 to-yellow-600"
    },
  ];

  const stats = [
    { number: "50K+", label: "Votes Cast", icon: CheckCircle },
    { number: "100+", label: "Events Hosted", icon: Award },
    { number: "99.9%", label: "Uptime", icon: TrendingUp },
    { number: "24/7", label: "Support", icon: Users },
  ];

  const features = [
    "Secure & encrypted voting system",
    "Real-time results and analytics",
    "USSD voting for accessibility",
    "Multi-stage competition support",
    "Fraud detection & prevention",
    "Audit-ready reporting",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      {/* Hero Section */}
      <section className="relative bg-[#006726] text-white py-20 md:py-32 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeIn} className="mb-6">
              <span className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold">
                About Pawavotes
              </span>
            </motion.div>
            
            <motion.h1
              variants={fadeIn}
              className="text-4xl md:text-6xl font-bold mb-6"
            >
              Building Trust in
            </motion.h1>
            
            <motion.p
              variants={fadeIn}
              className="text-xl md:text-2xl text-green-100 max-w-3xl mx-auto mb-8"
            >
              Africa's most trusted digital voting platform for public awards and institutional elections
            </motion.p>

            <motion.div
              variants={fadeIn}
              className="flex flex-wrap justify-center gap-4"
            >
              <a
                href="/contact-us"
                className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors"
              >
                Get Started
              </a>
              <a
                href="/find-vote"
                className="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors"
              >
                Explore Events
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                className="text-center"
              >
                <div className="flex justify-center mb-3">
                  <div className="bg-green-100 p-3 rounded-full">
                    <stat.icon className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 text-sm md:text-base">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-12"
          >
            {/* Mission */}
            <motion.div variants={fadeIn} className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="bg-linear-to-br from-green-500 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                To democratize access to secure, transparent, and verifiable voting systems across Africa, 
                ensuring every voice is heard and every vote counts. We're committed to building trust in 
                democratic processes through technology.
              </p>
            </motion.div>

            {/* Vision */}
            <motion.div variants={fadeIn} className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="bg-linear-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                To become Africa's leading digital voting platform, setting the standard for electoral 
                integrity and transparency. We envision a future where every election, award, and decision 
                is powered by trust and technology.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {values.map((value, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                whileHover={{ y: -10 }}
                className="bg-gray-50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300"
              >
                <div className={`bg-linear-to-br ${value.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}>
                  <value.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section className="py-20 bg-linear-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            <motion.div variants={fadeIn}>
              <h2 className="text-4xl font-bold mb-6">What We Offer</h2>
              <p className="text-gray-300 text-lg mb-8">
                Pawavotes provides a comprehensive voting platform designed for the African context, 
                combining cutting-edge technology with local accessibility.
              </p>
              
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    variants={fadeIn}
                    className="flex items-center gap-3"
                  >
                    <div className="bg-green-500 rounded-full p-1">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-200">{feature}</span>
                  </motion.div>
                ))}
              </div>

              <motion.div variants={fadeIn} className="mt-8">
                <a
                  href="/contact-us"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Learn More
                </a>
              </motion.div>
            </motion.div>

            <motion.div
              variants={scaleIn}
              className="relative"
            >
              <div className="bg-linear-to-br from-green-500 to-green-600 rounded-2xl p-8 shadow-2xl">
                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <Globe className="w-12 h-12 text-white mb-4" />
                    <h3 className="text-xl font-bold mb-2">Pan-African Reach</h3>
                    <p className="text-green-100">
                      Serving communities across Ghana and expanding throughout Africa
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <Shield className="w-12 h-12 text-white mb-4" />
                    <h3 className="text-xl font-bold mb-2">Bank-Level Security</h3>
                    <p className="text-green-100">
                      Military-grade encryption protecting every vote and voter
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <Users className="w-12 h-12 text-white mb-4" />
                    <h3 className="text-xl font-bold mb-2">24/7 Support</h3>
                    <p className="text-green-100">
                      Dedicated team ready to assist organizers and voters anytime
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-linear-to-r from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeIn}
              className="text-4xl md:text-5xl font-bold text-white mb-6"
            >
              Ready to Get Started?
            </motion.h2>
            <motion.p
              variants={fadeIn}
              className="text-xl text-green-100 mb-8"
            >
              Join thousands of organizations using Pawavotes for their voting needs
            </motion.p>
            <motion.div
              variants={fadeIn}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <a
                href="/contact-us"
                className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold hover:bg-green-50 transition-colors text-lg"
              >
                Contact Us
              </a>
              <a
                href="/find-vote"
                className="bg-green-800 text-white px-8 py-4 rounded-lg font-semibold hover:bg-green-900 transition-colors text-lg"
              >
                Explore Events
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="Pawavotes"
                width={50}
                height={50}
              />
              <span className="text-xl font-bold text-green-400">Pawavotes</span>
            </div>
            <p className="text-gray-400 text-sm text-center md:text-left">
              © {new Date().getFullYear()} Pawavotes. All rights reserved. Built for trust and transparency in Africa.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="/privacy" className="text-gray-400 hover:text-green-400 transition-colors">
                Privacy
              </a>
              <a href="/terms" className="text-gray-400 hover:text-green-400 transition-colors">
                Terms
              </a>
              <a href="/contact-us" className="text-gray-400 hover:text-green-400 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
