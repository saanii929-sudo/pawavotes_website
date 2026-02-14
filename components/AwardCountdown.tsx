"use client";
import { useState, useEffect } from "react";
import { Calendar, Clock, Zap } from "lucide-react";

interface CountdownProps {
  startDate?: string;
  endDate?: string;
  votingStartDate?: string;
  votingEndDate?: string;
  votingStartTime?: string;
  votingEndTime?: string;
  status?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const AwardCountdown = ({
  startDate,
  endDate,
  votingStartDate,
  votingEndDate,
  votingStartTime,
  votingEndTime,
  status,
}: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });
  const [phase, setPhase] = useState<"upcoming" | "voting" | "ended">("upcoming");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      
      // Combine date and time for voting start
      let votingStart: Date | null = null;
      if (votingStartDate) {
        votingStart = new Date(votingStartDate);
        if (votingStartTime) {
          const [hours, minutes] = votingStartTime.split(':');
          votingStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
      }

      // Combine date and time for voting end
      let votingEnd: Date | null = null;
      if (votingEndDate) {
        votingEnd = new Date(votingEndDate);
        if (votingEndTime) {
          const [hours, minutes] = votingEndTime.split(':');
          votingEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
      }

      let targetDate: Date | null = null;
      let currentPhase: "upcoming" | "voting" | "ended" = "upcoming";

      // Determine phase and target date
      if (votingEnd && now > votingEnd.getTime()) {
        currentPhase = "ended";
        targetDate = votingEnd;
      } else if (votingStart && now >= votingStart.getTime() && votingEnd && now < votingEnd.getTime()) {
        // Only show countdown during voting period (from start to end)
        currentPhase = "voting";
        targetDate = votingEnd;
      } else if (votingStart && now < votingStart.getTime()) {
        currentPhase = "upcoming";
        targetDate = votingStart;
      }

      setPhase(currentPhase);

      if (!targetDate) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
        };
      }

      const difference = targetDate.getTime() - now;

      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
        };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        total: difference,
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [votingStartDate, votingEndDate, votingStartTime, votingEndTime]);

  if (!mounted) {
    return null;
  }

  // Don't show countdown if voting hasn't started yet
  if (phase === "upcoming") {
    return null;
  }

  const getPhaseConfig = () => {
    switch (phase) {
      case "upcoming":
        return {
          title: "Voting Starts In",
          gradient: "from-blue-500 via-purple-500 to-pink-500",
          glowColor: "rgba(147, 51, 234, 0.5)",
          icon: <Calendar className="w-6 h-6" />,
        };
      case "voting":
        return {
          title: "Voting Ends In",
          gradient: "from-green-500 via-emerald-500 to-teal-500",
          glowColor: "rgba(16, 185, 129, 0.5)",
          icon: <Zap className="w-6 h-6" />,
        };
      case "ended":
        return {
          title: "Voting Has Ended",
          gradient: "from-gray-500 via-gray-600 to-gray-700",
          glowColor: "rgba(107, 114, 128, 0.5)",
          icon: <Clock className="w-6 h-6" />,
        };
    }
  };

  const config = getPhaseConfig();

  if (phase === "ended") {
    return (
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 sm:p-8">
        <div className="relative z-10 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="text-white">{config.icon}</div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">{config.title}</h3>
          </div>
          <p className="text-gray-400 text-sm sm:text-base">Check back for results!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 sm:p-6 md:p-8">
      {/* Animated background gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-10 animate-pulse`}
      ></div>
      
      {/* Floating orbs - hidden on mobile for performance */}
      <div className="hidden sm:block absolute top-0 left-0 w-48 sm:w-72 h-48 sm:h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="hidden sm:block absolute top-0 right-0 w-48 sm:w-72 h-48 sm:h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="hidden sm:block absolute bottom-0 left-1/2 w-48 sm:w-72 h-48 sm:h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 md:mb-8">
          <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r ${config.gradient} shadow-lg`}>
            {config.icon}
          </div>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center">{config.title}</h3>
        </div>

        {/* Countdown Display */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          {[
            { value: timeLeft.days, label: "Days" },
            { value: timeLeft.hours, label: "Hours" },
            { value: timeLeft.minutes, label: "Minutes" },
            { value: timeLeft.seconds, label: "Seconds" },
          ].map((item, index) => (
            <div key={item.label} className="relative group">
              {/* Glow effect - reduced on mobile */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${config.gradient} rounded-lg sm:rounded-xl md:rounded-2xl blur-md sm:blur-xl opacity-30 sm:opacity-50 group-hover:opacity-75 transition-opacity duration-300`}
                style={{
                  animation: `pulse ${2 + index * 0.5}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                }}
              ></div>
              
              {/* Card */}
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 transform hover:scale-105">
                {/* Number */}
                <div className="relative">
                  <div
                    className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent mb-1 sm:mb-2`}
                  >
                    {String(item.value).padStart(2, "0")}
                  </div>
                  
                  {/* Animated underline */}
                  <div className={`h-0.5 sm:h-1 bg-gradient-to-r ${config.gradient} rounded-full transform origin-left transition-transform duration-300 group-hover:scale-x-100 scale-x-75`}></div>
                </div>
                
                {/* Label */}
                <div className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-400 uppercase tracking-wider mt-1 sm:mt-2">
                  {item.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 sm:h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${config.gradient} rounded-full transition-all duration-1000 ease-out`}
            style={{
              width: `${Math.min(100, (timeLeft.seconds / 60) * 100)}%`,
            }}
          >
            <div className="absolute inset-0 bg-white opacity-30 animate-shimmer"></div>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center mt-3 sm:mt-4 md:mt-6">
          <p className="text-gray-400 text-xs sm:text-sm">
            {phase === "upcoming" && "Get ready to cast your vote!"}
            {phase === "voting" && "Voting is live! Cast your vote now!"}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default AwardCountdown;
