"use client";

import { motion, Variants } from "framer-motion";
import {
  Calendar,
  Ticket,
  Clock,
  Sparkles,
  Bell,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect } from "react";

const ComingSoonPage = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const floatingVariants: Variants = {
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const pulseVariants: Variants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const features = [
    {
      icon: Ticket,
      title: "Event Ticketing",
      description: "Create and manage tickets for your events",
    },
    {
      icon: Calendar,
      title: "Event Management",
      description: "Organize and schedule events seamlessly",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Keep attendees informed with real-time updates",
    },
  ];

  if (!mounted) return null;

  return (
    <div className=" bg-linear-to-br from-gray-50 via-green-50/30 to-gray-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          variants={pulseVariants}
          animate="animate"
          className="absolute top-20 left-10 w-72 h-72 bg-green-200/30 rounded-full blur-3xl"
        />
        <motion.div
          variants={pulseVariants}
          animate="animate"
          style={{ animationDelay: "1s" }}
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"
        />
        <motion.div
          variants={pulseVariants}
          animate="animate"
          style={{ animationDelay: "2s" }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-purple-200/10 rounded-full blur-3xl"
        />
      </div>

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20"
      >
        {/* Floating Icon */}
        <motion.div
          variants={floatingVariants}
          animate="animate"
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <motion.div
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 bg-linear-to-r from-green-400 to-blue-500 rounded-full opacity-50"
            />
            <div className="relative bg-white rounded-full p-6">
              <Ticket className="w-16 h-16 text-green-600" />
            </div>
          </div>
        </motion.div>

        {/* Coming Soon Badge */}
        <motion.div
          variants={itemVariants}
          className="flex justify-center mb-6"
        >
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
            <Sparkles className="w-4 h-4" />
            Coming Soon
          </div>
        </motion.div>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-center text-gray-600 text-lg sm:text-xl max-w-2xl mx-auto mb-12"
        >
          We're working hard to bring you an amazing event ticketing experience.
          Stay tuned for powerful features to manage your events effortlessly.
        </motion.p>

        {/* Features Grid */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl transition-shadow"
            >
              <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ComingSoonPage;
