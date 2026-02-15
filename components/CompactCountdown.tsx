"use client";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CompactCountdownProps {
  votingStartDate?: string;
  votingEndDate?: string;
  votingStartTime?: string;
  votingEndTime?: string;
}

const CompactCountdown = ({
  votingStartDate,
  votingEndDate,
  votingStartTime,
  votingEndTime,
}: CompactCountdownProps) => {
  const [timeText, setTimeText] = useState<string>("");
  const [phase, setPhase] = useState<"upcoming" | "voting" | "ended">("upcoming");

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
        setPhase(currentPhase);
        setTimeText("Ended");
        return;
      } else if (votingStart && now >= votingStart.getTime() && votingEnd && now < votingEnd.getTime()) {
        // Only show countdown during voting period
        currentPhase = "voting";
        targetDate = votingEnd;
      } else if (votingStart && now < votingStart.getTime()) {
        // Don't show anything if voting hasn't started
        currentPhase = "upcoming";
        setPhase(currentPhase);
        setTimeText("");
        return;
      }

      setPhase(currentPhase);

      if (!targetDate) {
        setTimeText("");
        return;
      }

      const difference = targetDate.getTime() - now;

      if (difference <= 0) {
        setTimeText("Ending...");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      if (days > 0) {
        setTimeText(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeText(`${hours}h ${minutes}m`);
      } else {
        setTimeText(`${minutes}m`);
      }
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();

    return () => clearInterval(timer);
  }, [votingStartDate, votingEndDate, votingStartTime, votingEndTime]);



  const getPhaseColor = () => {
    switch (phase) {
      case "upcoming":
        return "bg-blue-500";
      case "voting":
        return "bg-green-500 animate-pulse";
      case "ended":
        return "bg-gray-500";
    }
  };

  const getPhaseText = () => {
    switch (phase) {
      case "upcoming":
        return "Starts in";
      case "voting":
        return "Ends in";
      case "ended":
        return "Voting";
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${getPhaseColor()} text-white text-[10px] sm:text-xs font-semibold shadow-lg`}>
      <Clock size={10} className={`sm:w-3 sm:h-3 ${phase === "voting" ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
      <span className="whitespace-nowrap">{getPhaseText()}: {timeText}</span>
    </div>
  );
};

export default CompactCountdown;
