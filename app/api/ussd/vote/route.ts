import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import UssdSession from "@/models/UssdSession";
import Award from "@/models/Award";
import Category from "@/models/Category";
import Nominee from "@/models/Nominee";
import Vote from "@/models/Vote";
import { randomBytes } from "crypto";

// Constants for optimization
const ITEMS_PER_PAGE = 6; // Increased from 4 for better UX
const MIN_VOTES = 1;
const MAX_VOTES = 1000;
const HIGH_VOTE_THRESHOLD = 100;
const MAX_ERROR_COUNT = 3;
const SESSION_TIMEOUT_MS = 120000; // 2 minutes
const MAX_MESSAGE_LENGTH = 160;

// Helper function for consistent navigation text
function getNavigationText(step: string): string {
  if (step === "welcome") {
    return "0. Exit";
  }
  return "0. Back";
}

// Helper function to compress messages
function compressMessage(text: string, maxLength = MAX_MESSAGE_LENGTH): string {
  if (text.length <= maxLength) return text;

  // Apply compression rules
  text = text
    .replace(/Ghana Cedis/g, "GHS")
    .replace(/Enter number of/g, "Enter")
    .replace(/Select (\w+):/g, "$1:")
    .replace(/\n\n\n/g, "\n\n") // Max 2 line breaks
    .replace(/ {2,}/g, " "); // Single spaces only

  // Truncate if still too long
  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + "...";
  }

  return text;
}

// Helper function to truncate long names
function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + "...";
}

// Helper function to handle errors with retry logic
function handleError(session: any, message: string, continueSession: boolean = true) {
  session.data.errorCount = (session.data.errorCount || 0) + 1;
  
  if (session.data.errorCount > MAX_ERROR_COUNT) {
    return {
      message: "Too many errors. Please dial again to restart.",
      continueSession: false,
    };
  }
  
  return {
    message: compressMessage(`${message}\n\n${getNavigationText(session.currentStep)}`),
    continueSession,
  };
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { sessionID, userID, newSession, msisdn, userData, network } = body;
    const sessionId = sessionID;
    const phoneNumber = msisdn;
    const text = userData || "";

    let session = await UssdSession.findOne({ sessionId });

    if (!session || newSession === true) {
      session = await UssdSession.create({
        sessionId,
        phoneNumber,
        currentStep: "welcome",
        data: {},
        isActive: true,
        lastActivity: new Date(),
      });
    } else {
      session.lastActivity = new Date();
    }

    const userInput = text.split("*").pop() || "";
    const response = await handleUssdFlow(session, userInput, phoneNumber);
    await session.save();

    const arkeselResponse = {
      sessionID: sessionId,
      userID: userID || "CP9VG7Y5TN_dNri2",
      msisdn: phoneNumber,
      message: response.message,
      continueSession: response.continueSession,
    };

    return NextResponse.json(arkeselResponse);
  } catch (error: any) {
    return NextResponse.json({
      sessionID: "",
      userID: "CP9VG7Y5TN_dNri2",
      msisdn: "",
      message: "An error occurred. Please try again later.",
      continueSession: false,
    });
  }
}

async function handleUssdFlow(
  session: any,
  userInput: string,
  phoneNumber: string,
) {
  const step = session.currentStep;

  // Check session timeout
  const sessionAge = Date.now() - new Date(session.lastActivity).getTime();
  if (sessionAge > SESSION_TIMEOUT_MS && step !== "welcome") {
    return {
      message: "Session expired. Please dial again to continue.",
      continueSession: false,
    };
  }

  // Handle pagination
  if (userInput === "#") {
    return handleNextPage(session);
  }

  // Handle back navigation - consistent across all screens
  if (userInput === "0") {
    if (session.data.currentPage && session.data.currentPage > 1) {
      return handlePreviousPage(session);
    } else if (step === "welcome") {
      return {
        message: "Thank you for using PawaVotes!",
        continueSession: false,
      };
    } else {
      return handleBackNavigation(session);
    }
  }

  // Handle exit command
  if (userInput === "00") {
    return {
      message: "Thank you for using PawaVotes!",
      continueSession: false,
    };
  }

  switch (step) {
    case "welcome":
      return await showWelcome(session, userInput);

    case "quick_vote_code":
      return await handleQuickVoteCode(session, userInput);

    case "select_award":
      return await handleAwardSelection(session, userInput);

    case "select_category":
      return await handleCategorySelection(session, userInput);

    case "nominee_method":
      return await handleNomineeMethod(session, userInput);

    case "enter_nominee_code":
      return await handleNomineeCodeEntry(session, userInput);

    case "select_nominee":
      return await handleNomineeSelection(session, userInput);

    case "enter_votes":
      return await handleVoteQuantity(session, userInput);

    case "confirm_high_vote":
      return await handleHighVoteConfirmation(session, userInput);

    case "confirm":
      return await handleConfirmation(session, userInput, phoneNumber);

    case "confirm_network":
      return await handleNetworkConfirmation(session, userInput, phoneNumber);

    case "enter_payment_otp":
      return await handlePaymentOTP(session, userInput);

    default:
      return {
        message: "Invalid session. Please try again.",
        continueSession: false,
      };
  }
}

function handleBackNavigation(session: any) {
  console.log(`USSD: Back navigation from step: ${session.currentStep}`);

  const stepFlow: { [key: string]: string } = {
    select_award: "welcome",
    quick_vote_code: "welcome",
    select_category: "select_award",
    nominee_method: "select_category",
    enter_nominee_code: "nominee_method",
    select_nominee: "nominee_method",
    enter_votes: "nominee_method",
    confirm_high_vote: "enter_votes",
    confirm: "enter_votes",
    confirm_network: "confirm",
    enter_payment_otp: "confirm",
  };

  const previousStep = stepFlow[session.currentStep];

  if (!previousStep) {
    return { message: "Cannot go back from here.", continueSession: false };
  }

  // Reset error count on back navigation
  session.data.errorCount = 0;
  session.currentStep = previousStep;
  session.data.currentPage = 1;
  switch (previousStep) {
    case "welcome":
      return showWelcome(session, "");

    case "select_award":
      return showAwardMenu(session);

    case "select_category":
      return showCategoryMenu(session);

    case "nominee_method":
      return {
        message: compressMessage(`${session.data.categoryName}\n\nVoting Method:\n\n1. Enter Nominee Code\n2. Browse Nominees\n\n${getNavigationText("nominee_method")}`),
        continueSession: true,
      };

    case "enter_votes":
      const pricePerVote = session.data.awardCache?.pricing?.votingCost || 0.5;
      const displayName = truncateName(session.data.nomineeName, 25);
      const codeDisplay = session.data.nomineeCode ? ` (${session.data.nomineeCode})` : "";
      return {
        message: compressMessage(`Vote: ${displayName}${codeDisplay}\nGHS ${pricePerVote.toFixed(2)}/vote\n\nVotes:\n\n${getNavigationText("enter_votes")}`),
        continueSession: true,
      };

    default:
      return { message: "Error navigating back.", continueSession: false };
  }
}

function handleNextPage(session: any) {
  const currentPage = session.data.currentPage || 1;
  const totalPages = session.data.totalPages || 1;

  if (currentPage >= totalPages) {
    return {
      message:
        "You are on the last page. Please select an option or press 0 to go back.",
      continueSession: true,
    };
  }

  session.data.currentPage = currentPage + 1;

  switch (session.currentStep) {
    case "select_award":
      return showAwardMenu(session);
    case "select_category":
      return showCategoryMenu(session);
    case "select_nominee":
      return showNomineeMenu(session);
    default:
      return {
        message: "Pagination not available on this screen.",
        continueSession: true,
      };
  }
}

function handlePreviousPage(session: any) {
  const currentPage = session.data.currentPage || 1;

  if (currentPage <= 1) {
    return {
      message: "You are on the first page. Please select an option.",
      continueSession: true,
    };
  }

  session.data.currentPage = currentPage - 1;

  switch (session.currentStep) {
    case "select_award":
      return showAwardMenu(session);
    case "select_category":
      return showCategoryMenu(session);
    case "select_nominee":
      return showNomineeMenu(session);
    default:
      return {
        message: "Pagination not available on this screen.",
        continueSession: true,
      };
  }
}

function showAwardMenu(session: any) {
  const awards = session.data.awards || [];
  const itemsPerPage = ITEMS_PER_PAGE;
  const currentPage = session.data.currentPage || 1;
  const totalPages = Math.ceil(awards.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageAwards = awards.slice(startIndex, endIndex);

  if (pageAwards.length === 0) {
    return { message: "No awards available.", continueSession: false };
  }

  let menu = `Select Event (${currentPage}/${totalPages}):\n\n`;
  pageAwards.forEach((award: any, index: number) => {
    const truncatedName = truncateName(award.name, 30);
    menu += `${index + 1}. ${truncatedName}\n`;
  });

  if (currentPage < totalPages) {
    menu += `\n${itemsPerPage + 1}. Next Page`;
  }
  menu += `\n\n${getNavigationText("select_award")}`;

  session.data.totalPages = totalPages;
  session.data.pageStartIndex = startIndex;

  return { message: compressMessage(menu), continueSession: true };
}

function showCategoryMenu(session: any) {
  const categories = session.data.categories || [];
  const itemsPerPage = ITEMS_PER_PAGE;
  const currentPage = session.data.currentPage || 1;
  const totalPages = Math.ceil(categories.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageCategories = categories.slice(startIndex, endIndex);

  if (pageCategories.length === 0) {
    return { message: "No categories available.", continueSession: false };
  }

  const awardName = truncateName(session.data.awardName, 25);
  let menu = `${awardName} (${currentPage}/${totalPages})\n\nCategory:\n\n`;
  pageCategories.forEach((category: any, index: number) => {
    const catName = truncateName(category.name, 28);
    menu += `${index + 1}. ${catName}\n`;
  });

  if (currentPage < totalPages) {
    menu += `\n${itemsPerPage + 1}. Next Page`;
  }
  menu += `\n\n${getNavigationText("select_category")}`;

  session.data.totalPages = totalPages;
  session.data.pageStartIndex = startIndex;

  return { message: compressMessage(menu), continueSession: true };
}

function showNomineeMenu(session: any) {
  const nominees = session.data.nominees || [];
  const itemsPerPage = ITEMS_PER_PAGE;
  const currentPage = session.data.currentPage || 1;
  const totalPages = Math.ceil(nominees.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageNominees = nominees.slice(startIndex, endIndex);

  if (pageNominees.length === 0) {
    return { message: "No nominees available.", continueSession: false };
  }

  const catName = truncateName(session.data.categoryName, 25);
  let menu = `${catName} (${currentPage}/${totalPages})\n\nNominee:\n\n`;
  pageNominees.forEach((nominee: any, index: number) => {
    const code = nominee.nomineeCode ? ` (${nominee.nomineeCode})` : "";
    const nomName = truncateName(nominee.name, 22);
    menu += `${index + 1}. ${nomName}${code}\n`;
  });

  if (currentPage < totalPages) {
    menu += `\n${itemsPerPage + 1}. Next Page`;
  }
  menu += `\n\n${getNavigationText("select_nominee")}`;

  session.data.totalPages = totalPages;
  session.data.pageStartIndex = startIndex;

  return { message: compressMessage(menu), continueSession: true };
}

async function handleHighVoteConfirmation(session: any, userInput: string) {
  if (userInput === "1") {
    // User confirmed high vote
    const numberOfVotes = session.data.tempVotes;
    const pricePerVote = session.data.awardCache?.pricing?.votingCost || 0.5;
    const amount = numberOfVotes * pricePerVote;

    session.data.numberOfVotes = numberOfVotes;
    session.data.amount = amount;
    session.data.confirmedHighVote = false; // Reset
    session.data.tempVotes = null;
    session.currentStep = "confirm";

    const displayName = truncateName(session.data.nomineeName, 22);
    const codeDisplay = session.data.nomineeCode ? ` (${session.data.nomineeCode})` : "";
    
    return {
      message: compressMessage(`Confirm Vote\n\nNominee: ${displayName}${codeDisplay}\nVotes: ${numberOfVotes}\nTotal: GHS ${amount.toFixed(2)}\n\n1. Pay\n2. Cancel`),
      continueSession: true,
    };
  } else {
    // User cancelled, go back to vote entry
    session.data.confirmedHighVote = false;
    session.data.tempVotes = null;
    session.currentStep = "enter_votes";
    
    const pricePerVote = session.data.awardCache?.pricing?.votingCost || 0.5;
    const displayName = truncateName(session.data.nomineeName, 25);
    const codeDisplay = session.data.nomineeCode ? ` (${session.data.nomineeCode})` : "";
    
    return {
      message: compressMessage(`Vote: ${displayName}${codeDisplay}\nGHS ${pricePerVote.toFixed(2)}/vote\n\nVotes:\n\n${getNavigationText("enter_votes")}`),
      continueSession: true,
    };
  }
}

async function showWelcome(session: any, userInput?: string) {
  // Handle quick vote selection
  if (userInput === "2") {
    session.currentStep = "quick_vote_code";
    return {
      message: compressMessage(`Quick Vote\n\nEnter Nominee Code:\n(e.g., TGMA001)\n\n${getNavigationText("quick_vote_code")}`),
      continueSession: true,
    };
  }

  const awards = await Award.find({
    status: { $in: ["published", "active"] },
  })
    .select(
      "name status votingStartDate votingEndDate votingStartTime votingEndTime settings pricing",
    )
    .lean();

  if (awards.length === 0) {
    return {
      message:
        "No voting events are currently available. Please try again later.",
      continueSession: false,
    };
  }

  const now = new Date();
  const activeAwards = [];

  for (const award of awards) {
    let isActive = false;

    if (award.votingStartDate && award.votingEndDate) {
      const start = new Date(award.votingStartDate);
      const end = new Date(award.votingEndDate);

      if (award.votingStartTime) {
        const [hours, minutes] = award.votingStartTime.split(":");
        start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        start.setHours(0, 0, 0, 0);
      }

      if (award.votingEndTime) {
        const [hours, minutes] = award.votingEndTime.split(":");
        end.setHours(parseInt(hours), parseInt(minutes), 59, 999);
      } else {
        end.setHours(23, 59, 59, 999);
      }
      isActive = now >= start && now <= end;
    } else {
      isActive = true;
    }

    if (isActive) {
      activeAwards.push(award);
    }
  }

  if (activeAwards.length === 0) {
    return {
      message:
        "Voting is currently closed for all events. Please check back later.",
      continueSession: false,
    };
  }

  // If only one award, show quick vote option
  if (activeAwards.length === 1 && !userInput) {
    session.data.awards = activeAwards;
    session.data.awardId = activeAwards[0]._id.toString();
    session.data.awardName = activeAwards[0].name;
    // Cache award pricing
    session.data.awardCache = {
      pricing: activeAwards[0].pricing,
      votingStartDate: activeAwards[0].votingStartDate,
      votingEndDate: activeAwards[0].votingEndDate,
      votingStartTime: activeAwards[0].votingStartTime,
      votingEndTime: activeAwards[0].votingEndTime,
    };

    return {
      message: compressMessage(`Welcome to PawaVotes\n\n1. Browse Events\n2. Quick Vote (Code)\n\n${getNavigationText("welcome")}`),
      continueSession: true,
    };
  }

  session.currentStep = "select_award";
  session.data.awards = activeAwards;
  session.data.currentPage = 1;

  return showAwardMenu(session);
}

async function handleQuickVoteCode(session: any, userInput: string) {
  const nomineeCode = userInput.trim().toUpperCase().replace(/[-_\s]/g, "");

  // Validate code format
  const CODE_PATTERN = /^[A-Z0-9]{3,10}$/;
  if (!CODE_PATTERN.test(nomineeCode)) {
    session.data.errorCount = (session.data.errorCount || 0) + 1;
    if (session.data.errorCount > MAX_ERROR_COUNT) {
      return {
        message: "Too many errors. Please dial again to restart.",
        continueSession: false,
      };
    }
    return {
      message: compressMessage(`Invalid format\nExample: TGMA001\n\nTry again:\n\n${getNavigationText("quick_vote_code")}`),
      continueSession: true,
    };
  }

  // Find nominee by code
  const nominee = await Nominee.findOne({
    nomineeCode: nomineeCode,
    status: "published",
    nominationStatus: "accepted",
  })
    .select("name _id categoryId")
    .lean();

  if (!nominee) {
    session.data.errorCount = (session.data.errorCount || 0) + 1;
    if (session.data.errorCount > MAX_ERROR_COUNT) {
      return {
        message: "Too many errors. Please dial again to restart.",
        continueSession: false,
      };
    }
    return {
      message: compressMessage(`Code "${nomineeCode}" not found\n\nTry again:\n\n${getNavigationText("quick_vote_code")}`),
      continueSession: true,
    };
  }

  // Get category and award info
  const category = await Category.findById(nominee.categoryId)
    .select("name awardId")
    .lean();

  if (!category) {
    return {
      message: "Category not found. Please try again.",
      continueSession: false,
    };
  }

  // Get award info and cache pricing
  const award = await Award.findById(category.awardId)
    .select("name pricing votingStartDate votingEndDate votingStartTime votingEndTime")
    .lean();

  if (!award) {
    return {
      message: "Event not found. Please try again.",
      continueSession: false,
    };
  }

  // Store in session
  session.data.awardId = category.awardId.toString();
  session.data.awardName = award.name;
  session.data.categoryId = nominee.categoryId.toString();
  session.data.categoryName = category.name;
  session.data.nomineeId = nominee._id.toString();
  session.data.nomineeName = nominee.name;
  session.data.nomineeCode = nomineeCode;
  session.data.errorCount = 0; // Reset error count

  // Cache award pricing
  session.data.awardCache = {
    pricing: award.pricing,
    votingStartDate: award.votingStartDate,
    votingEndDate: award.votingEndDate,
    votingStartTime: award.votingStartTime,
    votingEndTime: award.votingEndTime,
  };

  const pricePerVote = award?.pricing?.votingCost || 0.5;
  session.currentStep = "enter_votes";

  const displayName = truncateName(nominee.name, 25);
  return {
    message: compressMessage(`Vote: ${displayName} (${nomineeCode})\nGHS ${pricePerVote.toFixed(2)}/vote\n\nVotes:\n\n${getNavigationText("enter_votes")}`),
    continueSession: true,
  };
}

async function handleAwardSelection(session: any, userInput: string) {
  const awards = session.data?.awards;

  if (!awards || !Array.isArray(awards) || awards.length === 0) {
    return {
      message: "Session expired. Please dial the code again to start over.",
      continueSession: false,
    };
  }

  const selectedIndex = parseInt(userInput) - 1;
  const pageStartIndex = session.data.pageStartIndex || 0;
  const actualIndex = pageStartIndex + selectedIndex;
  const itemsPerPage = ITEMS_PER_PAGE;

  if (
    isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= itemsPerPage ||
    actualIndex >= awards.length
  ) {
    return handleError(session, `Invalid selection. Enter 1-${Math.min(itemsPerPage, awards.length - pageStartIndex)}`);
  }

  const selectedAward = awards[actualIndex];

  session.data.awardId = selectedAward._id.toString();
  session.data.awardName = selectedAward.name;
  session.data.currentPage = 1;
  session.data.errorCount = 0;
  session.data.awardCache = {
    pricing: selectedAward.pricing,
    votingStartDate: selectedAward.votingStartDate,
    votingEndDate: selectedAward.votingEndDate,
    votingStartTime: selectedAward.votingStartTime,
    votingEndTime: selectedAward.votingEndTime,
  };

  const categories = await Category.find({
    awardId: selectedAward._id,
    isPublished: true,
  })
    .select("name")
    .lean();

  if (!categories || categories.length === 0) {
    return {
      message:
        "No categories are available for this event. Please contact the organizer.",
      continueSession: false,
    };
  }

  session.currentStep = "select_category";
  session.data.categories = categories;

  return showCategoryMenu(session);
}

async function handleCategorySelection(session: any, userInput: string) {
  const selectedIndex = parseInt(userInput) - 1;
  const categories = session.data.categories;
  const pageStartIndex = session.data.pageStartIndex || 0;
  const actualIndex = pageStartIndex + selectedIndex;
  const itemsPerPage = ITEMS_PER_PAGE;

  if (
    isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= itemsPerPage ||
    actualIndex >= categories.length
  ) {
    return handleError(session, `Invalid selection. Enter 1-${Math.min(itemsPerPage, categories.length - pageStartIndex)}`);
  }

  const selectedCategory = categories[actualIndex];
  session.data.categoryId = selectedCategory._id.toString();
  session.data.categoryName = selectedCategory.name;
  session.data.currentPage = 1;
  session.data.errorCount = 0; // Reset error count

  session.currentStep = "nominee_method";

  const catName = truncateName(selectedCategory.name, 30);
  return {
    message: compressMessage(`${catName}\n\nVoting Method:\n\n1. Enter Nominee Code\n2. Browse Nominees\n\n${getNavigationText("nominee_method")}`),
    continueSession: true,
  };
}

async function handleNomineeMethod(session: any, userInput: string) {
  if (userInput === "1") {
    session.currentStep = "enter_nominee_code";
    return {
      message: compressMessage(`Enter Nominee Code\n(e.g., TGMA001):\n\n${getNavigationText("enter_nominee_code")}`),
      continueSession: true,
    };
  } else if (userInput === "2") {
    const nominees = await Nominee.find({
      categoryId: session.data.categoryId,
      status: "published",
      nominationStatus: "accepted",
    })
      .select("name nomineeCode")
      .lean();

    if (nominees.length === 0) {
      return {
        message: "No nominees are available for this category at the moment.",
        continueSession: false,
      };
    }

    session.currentStep = "select_nominee";
    session.data.nominees = nominees;
    session.data.currentPage = 1;

    return showNomineeMenu(session);
  } else {
    return handleError(session, "Invalid selection. Enter 1 or 2");
  }
}

async function handleNomineeCodeEntry(session: any, userInput: string) {
  const nomineeCode = userInput.trim().toUpperCase().replace(/[-_\s]/g, "");

  // Validate code format
  const CODE_PATTERN = /^[A-Z0-9]{3,10}$/;
  if (!CODE_PATTERN.test(nomineeCode)) {
    return handleError(session, `Invalid format\nExample: TGMA001\n\nTry again:`);
  }

  const nominee = await Nominee.findOne({
    nomineeCode: nomineeCode,
    categoryId: session.data.categoryId,
    status: "published",
    nominationStatus: "accepted",
  })
    .select("name _id")
    .lean();

  if (!nominee) {
    return handleError(session, `Code "${nomineeCode}" not found\n\nTry again:`);
  }

  session.data.nomineeId = nominee._id.toString();
  session.data.nomineeName = nominee.name;
  session.data.nomineeCode = nomineeCode;
  session.data.errorCount = 0; // Reset error count

  // Use cached pricing if available
  const pricePerVote = session.data.awardCache?.pricing?.votingCost || 0.5;
  session.currentStep = "enter_votes";

  const displayName = truncateName(nominee.name, 25);
  return {
    message: compressMessage(`Vote: ${displayName} (${nomineeCode})\nGHS ${pricePerVote.toFixed(2)}/vote\n\nVotes:\n\n${getNavigationText("enter_votes")}`),
    continueSession: true,
  };
}

async function handleNomineeSelection(session: any, userInput: string) {
  const selectedIndex = parseInt(userInput) - 1;
  const nominees = session.data.nominees;
  const pageStartIndex = session.data.pageStartIndex || 0;
  const actualIndex = pageStartIndex + selectedIndex;
  const itemsPerPage = ITEMS_PER_PAGE;

  if (
    isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= itemsPerPage ||
    actualIndex >= nominees.length
  ) {
    return handleError(session, `Invalid selection. Enter 1-${Math.min(itemsPerPage, nominees.length - pageStartIndex)}`);
  }

  const selectedNominee = nominees[actualIndex];
  session.data.nomineeId = selectedNominee._id.toString();
  session.data.nomineeName = selectedNominee.name;
  session.data.nomineeCode = selectedNominee.nomineeCode;
  session.data.errorCount = 0; // Reset error count

  // Use cached pricing if available
  const pricePerVote = session.data.awardCache?.pricing?.votingCost || 0.5;
  session.currentStep = "enter_votes";

  const displayName = truncateName(selectedNominee.name, 25);
  const codeDisplay = selectedNominee.nomineeCode ? ` (${selectedNominee.nomineeCode})` : "";
  
  return {
    message: compressMessage(`Vote: ${displayName}${codeDisplay}\nGHS ${pricePerVote.toFixed(2)}/vote\n\nVotes:\n\n${getNavigationText("enter_votes")}`),
    continueSession: true,
  };
}

async function handleVoteQuantity(session: any, userInput: string) {
  const numberOfVotes = parseInt(userInput);
  
  if (isNaN(numberOfVotes) || numberOfVotes < MIN_VOTES) {
    return handleError(session, `Invalid amount. Enter ${MIN_VOTES}-${MAX_VOTES} votes`);
  }
  
  if (numberOfVotes > MAX_VOTES) {
    return handleError(session, `Maximum ${MAX_VOTES} votes per transaction`);
  }
  
  // Use cached pricing
  const pricePerVote = session.data.awardCache?.pricing?.votingCost || 0.5;
  const amount = numberOfVotes * pricePerVote;

  // Check for high vote threshold
  if (numberOfVotes > HIGH_VOTE_THRESHOLD && !session.data.confirmedHighVote) {
    session.data.confirmedHighVote = true;
    session.data.tempVotes = numberOfVotes;
    session.currentStep = "confirm_high_vote";
    return {
      message: compressMessage(`Confirm ${numberOfVotes} votes?\n(GHS ${amount.toFixed(2)})\n\n1. Yes\n2. No`),
      continueSession: true,
    };
  }

  session.data.numberOfVotes = numberOfVotes;
  session.data.amount = amount;
  session.data.errorCount = 0; // Reset error count
  session.currentStep = "confirm";

  const displayName = truncateName(session.data.nomineeName, 22);
  const codeDisplay = session.data.nomineeCode ? ` (${session.data.nomineeCode})` : "";
  
  return {
    message: compressMessage(`Confirm Vote\n\nNominee: ${displayName}${codeDisplay}\nVotes: ${numberOfVotes}\nTotal: GHS ${amount.toFixed(2)}\n\n1. Pay\n2. Cancel`),
    continueSession: true,
  };
}

async function handleConfirmation(
  session: any,
  userInput: string,
  phoneNumber: string,
) {
  if (userInput === "2") {
    session.isActive = false;
    return {
      message: "Vote cancelled. Thank you for using PawaVotes.",
      continueSession: false,
    };
  }
  if (userInput !== "1") {
    return {
      message: "Invalid selection. Please enter 1 or 2.",
      continueSession: false,
    };
  }

  try {
    const award = await Award.findById(session.data.awardId)
      .select("votingStartDate votingEndDate votingStartTime votingEndTime")
      .lean();

    if (!award) {
      return {
        message: "Event not found. Please try again.",
        continueSession: false,
      };
    }

    const now = new Date();
    let isVotingOpen = false;

    try {
      const Stage = (await import("@/models/Stage")).default;
      const activeStage = await Stage.findOne({
        awardId: session.data.awardId,
        status: "active",
        stageType: "voting",
      })
        .select("startDate endDate startTime endTime")
        .lean();

      if (activeStage) {
        const stageStart = new Date(activeStage.startDate);
        const stageEnd = new Date(activeStage.endDate);

        if (activeStage.startTime) {
          const [hours, minutes] = activeStage.startTime.split(":");
          stageStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else {
          stageStart.setHours(0, 0, 0, 0);
        }

        if (activeStage.endTime) {
          const [hours, minutes] = activeStage.endTime.split(":");
          stageEnd.setHours(parseInt(hours), parseInt(minutes), 59, 999);
        } else {
          stageEnd.setHours(23, 59, 59, 999);
        }

        isVotingOpen = now >= stageStart && now <= stageEnd;
      } else {
        if (award.votingStartDate && award.votingEndDate) {
          const start = new Date(award.votingStartDate);
          const end = new Date(award.votingEndDate);

          if (award.votingStartTime) {
            const [hours, minutes] = award.votingStartTime.split(":");
            start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          } else {
            start.setHours(0, 0, 0, 0);
          }

          if (award.votingEndTime) {
            const [hours, minutes] = award.votingEndTime.split(":");
            end.setHours(parseInt(hours), parseInt(minutes), 59, 999);
          } else {
            end.setHours(23, 59, 59, 999);
          }

          isVotingOpen = now >= start && now <= end;
        } else {
          isVotingOpen = true;
        }
      }
    } catch (error) {
      if (award.votingStartDate && award.votingEndDate) {
        const start = new Date(award.votingStartDate);
        const end = new Date(award.votingEndDate);

        if (award.votingStartTime) {
          const [hours, minutes] = award.votingStartTime.split(":");
          start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else {
          start.setHours(0, 0, 0, 0);
        }

        if (award.votingEndTime) {
          const [hours, minutes] = award.votingEndTime.split(":");
          end.setHours(parseInt(hours), parseInt(minutes), 59, 999);
        } else {
          end.setHours(23, 59, 59, 999);
        }

        isVotingOpen = now >= start && now <= end;
      } else {
        isVotingOpen = true;
      }
    }

    if (!isVotingOpen) {
      session.isActive = false;
      return {
        message:
          "Voting has closed for this event. Your vote was not processed.",
        continueSession: false,
      };
    }

    // Check if network provider can be detected
    const detectedProvider = detectMobileProvider(phoneNumber);
    
    if (!detectedProvider) {
      // Network not detected - ask user to confirm
      session.currentStep = "confirm_network";
      return {
        message: `Confirm your network:\n\n1. MTN\n2. Telecel\n3. AirtelTigo\n\n0. Cancel`,
        continueSession: true,
      };
    }

    // Network detected - proceed with payment
    const paymentReference = `USSD-${Date.now()}-${randomBytes(6).toString('hex')}`;
    const dummyEmail = `${phoneNumber}@ussd.pawavotes.com`;

    let vote;
    try {
      vote = await Vote.create({
        awardId: session.data.awardId,
        categoryId: session.data.categoryId,
        nomineeId: session.data.nomineeId,
        voterEmail: dummyEmail,
        voterPhone: phoneNumber,
        numberOfVotes: session.data.numberOfVotes,
        amount: session.data.amount,
        paymentReference,
        paymentMethod: "ussd",
        paymentStatus: "pending",
      });
    } catch (voteError: any) {
      return {
        message: "Error creating vote record. Please try again.",
        continueSession: false,
      };
    }

    const paystackResponse = await initiatePaystackCharge(
      dummyEmail,
      session.data.amount,
      phoneNumber,
      paymentReference,
    );

    if (paystackResponse.success) {
      const chargeStatus = paystackResponse.data?.data?.status;
      const displayText = paystackResponse.data?.data?.display_text;

      console.log(`Charge status: ${chargeStatus}`);
      console.log(`Display text: ${displayText}`);

      // Handle different charge statuses
      switch (chargeStatus) {
        case "send_otp":
          session.currentStep = "enter_payment_otp";
          session.data.paymentReference = paymentReference;
          session.data.otpAttempts = 0;
          return {
            message: `OTP sent to your phone\n\nEnter OTP:\n\n0. Cancel`,
            continueSession: true,
          };

        case "pending":
          session.currentStep = "enter_payment_otp";
          session.data.paymentReference = paymentReference;
          session.data.otpAttempts = 0;
          return {
            message: `OTP sent to your phone\n\nEnter OTP:\n\n0. Cancel`,
            continueSession: true,
          };

        case "pay_offline":
          session.isActive = false;
          const provider = detectMobileProvider(phoneNumber);
          let offlineInstructions = "";
          
          switch (provider) {
            case "mtn":
              offlineInstructions = `Dial *170# > My Approvals\nApprove GHS ${session.data.amount.toFixed(2)}`;
              break;
            case "vod":
              offlineInstructions = `Dial *110# > Pending Payments\nApprove GHS ${session.data.amount.toFixed(2)}`;
              break;
            case "tgo":
              offlineInstructions = `Check your phone for approval request\nApprove GHS ${session.data.amount.toFixed(2)}`;
              break;
            default:
              offlineInstructions = `Check your phone to approve payment\nAmount: GHS ${session.data.amount.toFixed(2)}`;
          }

          return {
            message: `Payment Initiated!\n\n${offlineInstructions}\n\nFor: ${session.data.nomineeName}\nVotes: ${session.data.numberOfVotes}\n\nThank you!`,
            continueSession: false,
          };

        case "success":
          await Vote.findByIdAndUpdate(vote._id, {
            paymentStatus: "completed",
          });
          await Nominee.findByIdAndUpdate(session.data.nomineeId, {
            $inc: { voteCount: session.data.numberOfVotes },
          });
          session.isActive = false;
          return {
            message: `Vote Successful!\n\n${session.data.numberOfVotes} vote(s) for ${session.data.nomineeName}\n\nAmount: GHS ${session.data.amount.toFixed(2)}\n\nThank you for voting!`,
            continueSession: false,
          };

        case "failed":
          await Vote.findByIdAndUpdate(vote._id, { paymentStatus: "failed" });
          session.isActive = false;
          return {
            message: `Payment Failed!\n\n${displayText || "Unable to process payment. Please try again."}\n\nThank you!`,
            continueSession: false,
          };

        default:
          session.isActive = false;
          return {
            message: `Vote Submitted!\n\nPlease complete the payment on your phone.\n\nFor: ${session.data.nomineeName}\nVotes: ${session.data.numberOfVotes}\nAmount: GHS ${session.data.amount.toFixed(2)}\n\nThank you!`,
            continueSession: false,
          };
      }
    } else {
      const isTestMode =
        process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_");

      if (isTestMode) {
        const updatedVote = await Vote.findByIdAndUpdate(
          vote._id,
          { paymentStatus: "completed" },
          { new: true },
        );
        await Nominee.findByIdAndUpdate(session.data.nomineeId, {
          $inc: { voteCount: session.data.numberOfVotes },
        });

        session.isActive = false;
        return {
          message: `TEST MODE: Vote recorded successfully!\n\nNominee: ${session.data.nomineeName}\nVotes: ${session.data.numberOfVotes}\nAmount: GHS ${session.data.amount.toFixed(2)}\n\nNote: Using test keys. Mobile money requires live Paystack keys.\n\nThank you for using PawaVotes!`,
          continueSession: false,
        };
      }
      await Vote.findByIdAndUpdate(vote._id, { paymentStatus: "failed" });
      return {
        message:
          "Payment initiation failed. Please try again later or contact support.",
        continueSession: false,
      };
    }
  } catch (error: any) {
    return {
      message:
        "An error occurred while processing your vote. Please try again.",
      continueSession: false,
    };
  }
}

async function initiatePaystackCharge(
  email: string,
  amount: number,
  phoneNumber: string,
  reference: string,
) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const amountInKobo = Math.round(amount * 100);
    const provider = detectMobileProvider(phoneNumber);

    if (!provider) {
      return {
        success: false,
        error: "Unsupported mobile network",
      };
    }

    let formattedPhone = phoneNumber.replace(/[\s\-+]/g, "");

    if (formattedPhone.startsWith("0")) {
      formattedPhone = formattedPhone.substring(1);
    }

    if (formattedPhone.startsWith("233")) {
      formattedPhone = formattedPhone.substring(3);
    }

    if (!formattedPhone.startsWith("0")) {
      formattedPhone = "0" + formattedPhone;
    }

    console.log(
      `Original phone: ${phoneNumber}, Formatted phone: ${formattedPhone}, Provider: ${provider}`,
    );

    const chargeRequest = {
      email,
      amount: amountInKobo,
      currency: "GHS",
      reference,
      metadata: {
        phoneNumber: formattedPhone,
        payment_method: "stk_push",
        direct_charge: true,
      },
      mobile_money: {
        phone: formattedPhone,
        provider: provider,
      },
    };

    console.log(
      "Paystack charge request:",
      JSON.stringify(chargeRequest, null, 2),
    );

    const response = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(chargeRequest),
    });

    const data = await response.json();
    console.log("Paystack charge response:", JSON.stringify(data, null, 2));

    return {
      success: data.status === true,
      data,
    };
  } catch (error: any) {
    console.error("Paystack charge error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function handleNetworkConfirmation(
  session: any,
  userInput: string,
  phoneNumber: string,
) {
  const networkMap: { [key: string]: string } = {
    "1": "mtn",
    "2": "vod",
    "3": "tgo",
  };

  const selectedProvider = networkMap[userInput];

  if (!selectedProvider) {
    return {
      message: "Invalid selection. Please enter 1, 2, or 3.",
      continueSession: false,
    };
  }

  session.data.confirmedNetwork = selectedProvider;
  return await processPayment(session, phoneNumber, selectedProvider);
}

async function handlePaymentOTP(session: any, userInput: string) {
  const otpInput = userInput.trim();

  if (!otpInput || otpInput.length < 4) {
    return {
      message: "Invalid OTP. Enter 4-6 digit code:\n\n0. Cancel",
      continueSession: true,
    };
  }

  const otpAttempts = (session.data.otpAttempts || 0) + 1;
  session.data.otpAttempts = otpAttempts;

  if (otpAttempts > 3) {
    session.isActive = false;
    return {
      message: "Too many attempts. Please try voting again.",
      continueSession: false,
    };
  }

  const result = await submitPaystackOTP(
    otpInput,
    session.data.paymentReference,
  );

  if (result.success) {
    await Vote.findOneAndUpdate(
      { paymentReference: session.data.paymentReference },
      { paymentStatus: "completed" },
    );
    await Nominee.findByIdAndUpdate(session.data.nomineeId, {
      $inc: { voteCount: session.data.numberOfVotes },
    });

    session.isActive = false;
    return {
      message: `Vote Successful!\n\n${session.data.numberOfVotes} vote(s) for ${session.data.nomineeName}\n\nAmount: GHS ${session.data.amount.toFixed(2)}\n\nThank you!`,
      continueSession: false,
    };
  } else {
    const attemptsLeft = 3 - otpAttempts;
    if (attemptsLeft > 0) {
      return {
        message: `Invalid OTP. Try again (${attemptsLeft} left):\n\n0. Cancel`,
        continueSession: true,
      };
    } else {
      session.isActive = false;
      return {
        message: "Too many attempts. Please try voting again.",
        continueSession: false,
      };
    }
  }
}

async function submitPaystackOTP(otp: string, reference: string) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    const response = await fetch("https://api.paystack.co/charge/submit_otp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ otp, reference }),
    });

    const data = await response.json();
    console.log("Paystack OTP submission response:", JSON.stringify(data, null, 2));

    return {
      success: data.status === true && data.data?.status === "success",
      data,
    };
  } catch (error: any) {
    console.error("Paystack OTP submission error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function processPayment(
  session: any,
  phoneNumber: string,
  provider: string,
) {
  try {
    const paymentReference = `USSD-${Date.now()}-${randomBytes(6).toString('hex')}`;
    const dummyEmail = `${phoneNumber}@ussd.pawavotes.com`;

    let vote;
    try {
      vote = await Vote.create({
        awardId: session.data.awardId,
        categoryId: session.data.categoryId,
        nomineeId: session.data.nomineeId,
        voterEmail: dummyEmail,
        voterPhone: phoneNumber,
        numberOfVotes: session.data.numberOfVotes,
        amount: session.data.amount,
        paymentReference,
        paymentMethod: "ussd",
        paymentStatus: "pending",
      });
    } catch (voteError: any) {
      return {
        message: "Error creating vote record. Please try again.",
        continueSession: false,
      };
    }

    const paystackResponse = await initiatePaystackChargeWithProvider(
      dummyEmail,
      session.data.amount,
      phoneNumber,
      paymentReference,
      provider,
    );

    if (paystackResponse.success) {
      const chargeStatus = paystackResponse.data?.data?.status;
      const displayText = paystackResponse.data?.data?.display_text;

      console.log(`Charge status: ${chargeStatus}`);
      console.log(`Display text: ${displayText}`);

      switch (chargeStatus) {
        case "send_otp":
          session.currentStep = "enter_payment_otp";
          session.data.paymentReference = paymentReference;
          session.data.otpAttempts = 0;
          return {
            message: `OTP sent to your phone\n\nEnter OTP:\n\n0. Cancel`,
            continueSession: true,
          };

        case "pending":
          session.currentStep = "enter_payment_otp";
          session.data.paymentReference = paymentReference;
          session.data.otpAttempts = 0;
          return {
            message: `OTP sent to your phone\n\nEnter OTP:\n\n0. Cancel`,
            continueSession: true,
          };

        case "pay_offline":
          session.isActive = false;
          let offlineInstructions = "";
          
          switch (provider) {
            case "mtn":
              offlineInstructions = `Dial *170# > My Approvals\nApprove GHS ${session.data.amount.toFixed(2)}`;
              break;
            case "vod":
              offlineInstructions = `Dial *110# > Pending Payments\nApprove GHS ${session.data.amount.toFixed(2)}`;
              break;
            case "tgo":
              offlineInstructions = `Check your phone for approval request\nApprove GHS ${session.data.amount.toFixed(2)}`;
              break;
            default:
              offlineInstructions = `Check your phone to approve payment\nAmount: GHS ${session.data.amount.toFixed(2)}`;
          }

          return {
            message: `Payment Initiated!\n\n${offlineInstructions}\n\nFor: ${session.data.nomineeName}\nVotes: ${session.data.numberOfVotes}\n\nThank you!`,
            continueSession: true,
          };

        case "success":
          await Vote.findByIdAndUpdate(vote._id, {
            paymentStatus: "completed",
          });
          await Nominee.findByIdAndUpdate(session.data.nomineeId, {
            $inc: { voteCount: session.data.numberOfVotes },
          });
          session.isActive = false;
          return {
            message: `Vote Successful!\n\n${session.data.numberOfVotes} vote(s) for ${session.data.nomineeName}\n\nAmount: GHS ${session.data.amount.toFixed(2)}\n\nThank you for voting!`,
            continueSession: false,
          };

        case "failed":
          await Vote.findByIdAndUpdate(vote._id, { paymentStatus: "failed" });
          session.isActive = false;
          return {
            message: `Payment Failed!\n\n${displayText || "Unable to process payment. Please try again."}\n\nThank you!`,
            continueSession: false,
          };

        default:
          session.isActive = false;
          return {
            message: `Vote Submitted!\n\nPlease complete the payment on your phone.\n\nFor: ${session.data.nomineeName}\nVotes: ${session.data.numberOfVotes}\nAmount: GHS ${session.data.amount.toFixed(2)}\n\nThank you!`,
            continueSession: false,
          };
      }
    } else {
      await Vote.findByIdAndUpdate(vote._id, { paymentStatus: "failed" });
      return {
        message:
          "Payment initiation failed. Please try again later or contact support.",
        continueSession: false,
      };
    }
  } catch (error: any) {
    return {
      message:
        "An error occurred while processing your vote. Please try again.",
      continueSession: false,
    };
  }
}

async function initiatePaystackChargeWithProvider(
  email: string,
  amount: number,
  phoneNumber: string,
  reference: string,
  provider: string,
) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const amountInKobo = Math.round(amount * 100);

    let formattedPhone = phoneNumber.replace(/[\s\-+]/g, "");

    if (formattedPhone.startsWith("0")) {
      formattedPhone = formattedPhone.substring(1);
    }

    if (formattedPhone.startsWith("233")) {
      formattedPhone = formattedPhone.substring(3);
    }

    if (!formattedPhone.startsWith("0")) {
      formattedPhone = "0" + formattedPhone;
    }

    console.log(
      `Original phone: ${phoneNumber}, Formatted phone: ${formattedPhone}, Provider: ${provider}`,
    );

    const chargeRequest = {
      email,
      amount: amountInKobo,
      currency: "GHS",
      reference,
      metadata: {
        phoneNumber: formattedPhone,
        payment_method: "stk_push",
        direct_charge: true,
      },
      mobile_money: {
        phone: formattedPhone,
        provider: provider,
      },
    };

    console.log(
      "Paystack charge request:",
      JSON.stringify(chargeRequest, null, 2),
    );

    const response = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(chargeRequest),
    });

    const data = await response.json();
    console.log("Paystack charge response:", JSON.stringify(data, null, 2));

    return {
      success: data.status === true,
      data,
    };
  } catch (error: any) {
    console.error("Paystack charge error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

function detectMobileProvider(phoneNumber: string): string | null {
  const cleanNumber = phoneNumber.replace(/[\s\-+]/g, "");
  let prefix = "";

  if (cleanNumber.startsWith("233")) {
    prefix = cleanNumber.substring(3, 5);
  } else if (cleanNumber.startsWith("0")) {
    prefix = cleanNumber.substring(1, 3);
  } else {
    prefix = cleanNumber.substring(0, 2);
  }
  
  // Updated prefix lists with additional ranges
  const mtnPrefixes = ["24", "25", "53", "54", "55", "59", "23", "28"];
  const telecelPrefixes = ["20", "50"];
  const airtelTigoPrefixes = ["26", "27", "56", "57"];

  if (mtnPrefixes.includes(prefix)) {
    return "mtn";
  } else if (telecelPrefixes.includes(prefix)) {
    return "vod";
  } else if (airtelTigoPrefixes.includes(prefix)) {
    return "tgo";
  }
  
  // Log undetected numbers for analysis
  console.warn(`Unknown network prefix: ${prefix} for ${phoneNumber}`);
  
  return null; // Return null instead of defaulting to "mtn"
}
