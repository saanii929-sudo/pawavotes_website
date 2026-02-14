'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ContactSection() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('Select');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const subjects = ['General Inquiry', 'Technical Support', 'Report An Issue'];

  const handleSubjectSelect = (subject: any) => {
    setSelectedSubject(subject);
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedSubject === 'Select') {
      toast.error('Please select a subject');
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading('Sending message...');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          subject: selectedSubject,
          message: formData.message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Message sent successfully! We\'ll get back to you soon.', { id: loadingToast });
        setFormData({ fullName: '', email: '', message: '' });
        setSelectedSubject('Select');
      } else {
        toast.error(data.error || 'Failed to send message', { id: loadingToast });
      }
    } catch (error) {
      toast.error('Failed to send message. Please try again.', { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      
    <nav className="bg-white sticky border-b border-gray-200 top-0 z-40">
      <div className="max-w-7xl relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center relative justify-between h-16">
          <Link href="/" className="flex relative items-center">
            <div className="flex items-center">
              {" "}
              <Image
                src="/images/logo.png"
                alt="Pawavotes"
                width={70}
                height={70}
              />{" "}
              <span className="text-xl absolute left-15 top-5 font-semibold text-green-600">
                {" "}
                Pawavotes{" "}
              </span>{" "}
            </div>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </div>
    </nav>

      {/* Main Contact Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left Column - Contact Info */}
          <div className="lg:pr-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h1>
            <p className="text-gray-600 mb-10 leading-relaxed">
              Have questions about setting up your next election or award show? 
              Our team of experts is ready to help you ensure a transparent and 
              secure voting experience.
            </p>

            {/* Contact Details */}
            <div className="space-y-6">
              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mt-1">
                  <Mail className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm">Email Us</h3>
                  <p className="text-gray-600 text-sm">support@pawavotes.com</p>
                  <p className="text-gray-600 text-sm">sales@pawavotes.com</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mt-1">
                  <Phone className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm">Call Us</h3>
                  <p className="text-gray-600 text-sm">+233 24 123 4567</p>
                  <p className="text-gray-600 text-sm">+233 55 987 6543</p>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mt-1">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm">Visit Our Office</h3>
                  <p className="text-gray-600 text-sm">12 Independence Avenue, Ridge</p>
                  <p className="text-gray-600 text-sm">Accra, Ghana</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Contact Form */}
          <div className="bg-white rounded-lg shadow-sm p-6 lg:p-8">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-6">
              Send us a Message
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name and Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="john-Doe@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                    required
                  />
                </div>
              </div>

              {/* Subject Dropdown */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-left text-sm flex items-center justify-between bg-white"
                  >
                    <span className={selectedSubject === 'Select' ? 'text-gray-400' : 'text-gray-900'}>
                      {selectedSubject}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        isDropdownOpen ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                      {subjects.map((subject, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSubjectSelect(subject)}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-green-50 transition-colors"
                        >
                          {subject}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Message Textarea */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="How can we help you?"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400 resize-none"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm mt-6"
              >
                {submitting ? 'Sending...' : 'Send Message'}
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex relative items-center gap-2 mb-4">
                <div className="w-30 h-30 flex items-center justify-end">
                  <Image
                  src="/images/logo.png"
                  alt="Pawavotes"
                  width={70}
                  height={70}
                />
                </div>
                <span className="text-xl font-bold text-green-600 absolute left-28">Pawavotes</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                The most trusted digital voting platform for public awards and 
                institutional elections in Africa.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-600 hover:text-green-600 text-sm transition-colors">
                    Public Voting
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-green-600 text-sm transition-colors">
                    Institutional Voting
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-600 hover:text-green-600 text-sm transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-green-600 text-sm transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-green-600 text-sm transition-colors">
                    Privacy policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-green-600 text-sm transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              © 2025 Pawavotes. All rights reserved. Built for trust and transparency in Africa.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}