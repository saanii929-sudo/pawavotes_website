"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

const PublicNav = () => {
  return (
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
  );
};

export default PublicNav;
