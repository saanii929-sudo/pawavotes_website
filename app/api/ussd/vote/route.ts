import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import UssdSession from '@/models/UssdSession';
import Award from '@/models/Award';
import Category from '@/models/Category';
import Nominee from '@/models/Nominee';
import Vote from '@/models/Vote';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { sessionID, userID, newSession, msisdn, userData, network } = body;
    const sessionId = sessionID;
    const phoneNumber = msisdn;
    const text = userData || '';
    
    let session = await UssdSession.findOne({ sessionId });
    
    if (!session || newSession === true) {
      session = await UssdSession.create({
        sessionId,
        phoneNumber,
        currentStep: 'welcome',
        data: {},
        isActive: true,
        lastActivity: new Date(),
      });
    } else {
      session.lastActivity = new Date();
    }
    
    const userInput = text.split('*').pop() || '';
    const response = await handleUssdFlow(session, userInput, phoneNumber);
    await session.save();

    const arkeselResponse = {
      sessionID: sessionId,
      userID: userID || 'CP9VG7Y5TN_dNri2',
      msisdn: phoneNumber,
      message: response.message,
      continueSession: response.continueSession,
    };

    return NextResponse.json(arkeselResponse);
  } catch (error: any) {
    console.error('USSD error:', error);
    return NextResponse.json({
      sessionID: '',
      userID: 'CP9VG7Y5TN_dNri2',
      msisdn: '',
      message: 'An error occurred. Please try again later.',
      continueSession: false,
    });
  }
}

async function handleUssdFlow(session: any, userInput: string, phoneNumber: string) {
  const step = session.currentStep;
  console.log(`USSD: handleUssdFlow - step: ${step}, input: ${userInput}`);

  switch (step) {
    case 'welcome':
      return await showWelcome(session);

    case 'select_award':
      console.log(`USSD: Calling handleAwardSelection`);
      return await handleAwardSelection(session, userInput);

    case 'select_category':
      return await handleCategorySelection(session, userInput);

    case 'nominee_method':
      return await handleNomineeMethod(session, userInput);

    case 'enter_nominee_code':
      return await handleNomineeCodeEntry(session, userInput);

    case 'select_nominee':
      return await handleNomineeSelection(session, userInput);

    case 'enter_votes':
      return await handleVoteQuantity(session, userInput);

    case 'confirm':
      return await handleConfirmation(session, userInput, phoneNumber);

    default:
      console.log(`USSD: Invalid step: ${step}`);
      return { message: 'Invalid session. Please try again.', continueSession: false };
  }
}

async function showWelcome(session: any) {
  console.log('USSD: Fetching active awards...');
  const awards = await Award.find({ 
    status: { $in: ['published', 'active'] } 
  })
    .select('name status votingStartDate votingEndDate votingStartTime votingEndTime settings')
    .limit(10)
    .lean();
  
  console.log(`USSD: Found ${awards.length} active awards`);
  
  if (awards.length === 0) {
    console.log('USSD: No active awards found in database');
    return { 
      message: 'No voting events are currently available. Please try again later.', 
      continueSession: false 
    };
  }

  const now = new Date();
  console.log(`USSD: Current time: ${now.toISOString()}`);
  const activeAwards = [];

  for (const award of awards) {
    console.log(`\nUSSD: Checking award: ${award.name}`);
    console.log(`USSD: - Status: ${award.status}`);
    console.log(`USSD: - votingStartDate: ${award.votingStartDate}`);
    console.log(`USSD: - votingEndDate: ${award.votingEndDate}`);
    console.log(`USSD: - votingStartTime: ${award.votingStartTime}`);
    console.log(`USSD: - votingEndTime: ${award.votingEndTime}`);
    
    let isActive = false;

    if (award.votingStartDate && award.votingEndDate) {
      const start = new Date(award.votingStartDate);
      const end = new Date(award.votingEndDate);

      // Add time if available
      if (award.votingStartTime) {
        const [hours, minutes] = award.votingStartTime.split(':');
        start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        start.setHours(0, 0, 0, 0);
      }

      if (award.votingEndTime) {
        const [hours, minutes] = award.votingEndTime.split(':');
        end.setHours(parseInt(hours), parseInt(minutes), 59, 999);
      } else {
        end.setHours(23, 59, 59, 999);
      }

      console.log(`USSD: - Award start: ${start.toISOString()}`);
      console.log(`USSD: - Award end: ${end.toISOString()}`);
      isActive = now >= start && now <= end;
      console.log(`USSD: - Award is active: ${isActive}`);
    } else {
      console.log('USSD: - No voting dates set, treating as active');
      isActive = true;
    }

    if (isActive) {
      console.log(`USSD: ✓ Award "${award.name}" added to active list`);
      activeAwards.push(award);
    } else {
      console.log(`USSD: ✗ Award "${award.name}" not active`);
    }
  }

  console.log(`\nUSSD: Total active awards: ${activeAwards.length}`);

  if (activeAwards.length === 0) {
    return { 
      message: 'Voting is currently closed for all events. Please check back later.', 
      continueSession: false 
    };
  }

  let menu = 'Welcome to PawaVotes\nVoting Platform\n\nSelect Event:\n\n';
  activeAwards.forEach((award, index) => {
    menu += `${index + 1}. ${award.name}\n`;
  });

  session.currentStep = 'select_award';
  session.data.awards = activeAwards;

  return { message: menu, continueSession: true };
}

async function handleAwardSelection(session: any, userInput: string) {
  const selectedIndex = parseInt(userInput) - 1;
  const awards = session.data.awards;

  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= awards.length) {
    return { 
      message: 'Invalid selection. Please enter a valid option number.', 
      continueSession: false 
    };
  }

  const selectedAward = awards[selectedIndex];
  session.data.awardId = selectedAward._id.toString();
  session.data.awardName = selectedAward.name;
  
  console.log(`USSD: Selected award: ${selectedAward.name} (ID: ${selectedAward._id})`);
  console.log(`USSD: Fetching categories for award...`);
  
  const categories = await Category.find({
    awardId: selectedAward._id,
    status: 'published',
  })
    .select('name')
    .limit(10)
    .lean();

  console.log(`USSD: Found ${categories ? categories.length : 0} categories`);

  if (!categories || categories.length === 0) {
    return { 
      message: 'No categories are available for this event. Please contact the organizer.', 
      continueSession: false 
    };
  }

  let menu = `${selectedAward.name}\n\nSelect Category:\n\n`;
  categories.forEach((category, index) => {
    menu += `${index + 1}. ${category.name}\n`;
  });

  session.currentStep = 'select_category';
  session.data.categories = categories;

  return { message: menu, continueSession: true };
}

async function handleCategorySelection(session: any, userInput: string) {
  const selectedIndex = parseInt(userInput) - 1;
  const categories = session.data.categories;

  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= categories.length) {
    return { 
      message: 'Invalid selection. Please enter a valid option number.', 
      continueSession: false 
    };
  }

  const selectedCategory = categories[selectedIndex];
  session.data.categoryId = selectedCategory._id.toString();
  session.data.categoryName = selectedCategory.name;

  session.currentStep = 'nominee_method';

  return {
    message: `${selectedCategory.name}\n\nVoting Method:\n\n1. Enter Nominee Code\n2. Browse Nominees`,
    continueSession: true,
  };
}

async function handleNomineeMethod(session: any, userInput: string) {
  if (userInput === '1') {
    session.currentStep = 'enter_nominee_code';
    return {
      message: `Enter Nominee Code\n(e.g., TGMA001):`,
      continueSession: true,
    };
  } else if (userInput === '2') {
    const nominees = await Nominee.find({
      categoryId: session.data.categoryId,
      status: 'published',
      nominationStatus: 'accepted',
    })
      .select('name nomineeCode')
      .limit(10)
      .lean();

    if (nominees.length === 0) {
      return { 
        message: 'No nominees are available for this category at the moment.', 
        continueSession: false 
      };
    }

    let menu = `${session.data.categoryName}\n\nSelect Nominee:\n\n`;
    nominees.forEach((nominee, index) => {
      const code = nominee.nomineeCode ? ` (${nominee.nomineeCode})` : '';
      menu += `${index + 1}. ${nominee.name}${code}\n`;
    });

    session.currentStep = 'select_nominee';
    session.data.nominees = nominees;

    return { message: menu, continueSession: true };
  } else {
    return { 
      message: 'Invalid selection. Please enter 1 or 2.', 
      continueSession: false 
    };
  }
}

async function handleNomineeCodeEntry(session: any, userInput: string) {
  const nomineeCode = userInput.trim().toUpperCase();

  const nominee = await Nominee.findOne({
    nomineeCode: nomineeCode,
    categoryId: session.data.categoryId,
    status: 'published',
    nominationStatus: 'accepted',
  })
    .select('name _id')
    .lean();

  if (!nominee) {
    return {
      message: `Nominee code "${nomineeCode}" not found in this category. Please verify and try again.`,
      continueSession: false,
    };
  }

  session.data.nomineeId = nominee._id.toString();
  session.data.nomineeName = nominee.name;
  session.data.nomineeCode = nomineeCode;

  const award = await Award.findById(session.data.awardId).select('pricing').lean();
  const pricePerVote = award?.pricing?.votingCost || 0.5;

  session.currentStep = 'enter_votes';

  return {
    message: `Voting For:\n${nominee.name} (${nomineeCode})\n\nGHS ${pricePerVote.toFixed(2)} per vote\n\nEnter number of votes (1-100):`,
    continueSession: true,
  };
}

async function handleNomineeSelection(session: any, userInput: string) {
  const selectedIndex = parseInt(userInput) - 1;
  const nominees = session.data.nominees;

  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= nominees.length) {
    return { 
      message: 'Invalid selection. Please enter a valid option number.', 
      continueSession: false 
    };
  }

  const selectedNominee = nominees[selectedIndex];
  session.data.nomineeId = selectedNominee._id.toString();
  session.data.nomineeName = selectedNominee.name;
  session.data.nomineeCode = selectedNominee.nomineeCode;

  const award = await Award.findById(session.data.awardId).select('pricing').lean();
  const pricePerVote = award?.pricing?.votingCost || 0.5;

  session.currentStep = 'enter_votes';

  const codeDisplay = selectedNominee.nomineeCode ? ` (${selectedNominee.nomineeCode})` : '';
  return {
    message: `Voting For:\n${selectedNominee.name}${codeDisplay}\n\nGHS ${pricePerVote.toFixed(2)} per vote\n\nEnter number of votes (1-100):`,
    continueSession: true,
  };
}

async function handleVoteQuantity(session: any, userInput: string) {
  const numberOfVotes = parseInt(userInput);
  if (isNaN(numberOfVotes) || numberOfVotes < 1 || numberOfVotes > 100) {
    return { 
      message: 'Invalid amount. Please enter a number between 1 and 100.', 
      continueSession: false 
    };
  }
  const award = await Award.findById(session.data.awardId).select('pricing').lean();
  const pricePerVote = award?.pricing?.votingCost || 0.5;
  const amount = numberOfVotes * pricePerVote;

  session.data.numberOfVotes = numberOfVotes;
  session.data.amount = amount;
  session.currentStep = 'confirm';

  const codeDisplay = session.data.nomineeCode ? ` (${session.data.nomineeCode})` : '';
  return {
    message: `Confirm Vote\n\nNominee: ${session.data.nomineeName}${codeDisplay}\nVotes: ${numberOfVotes}\nAmount: GHS ${amount.toFixed(2)}\n\n1. Confirm & Pay\n2. Cancel`,
    continueSession: true,
  };
}

async function handleConfirmation(session: any, userInput: string, phoneNumber: string) {
  if (userInput === '2') {
    session.isActive = false;
    return { message: 'Vote cancelled. Thank you for using PawaVotes.', continueSession: false };
  }
  if (userInput !== '1') {
    return { message: 'Invalid selection. Please enter 1 or 2.', continueSession: false };
  }

  try {
    // Validate that voting is still open
    const award = await Award.findById(session.data.awardId)
      .select('votingStartDate votingEndDate votingStartTime votingEndTime')
      .lean();

    if (!award) {
      return { message: 'Event not found. Please try again.', continueSession: false };
    }

    const now = new Date();
    let isVotingOpen = false;

    if (award.votingStartDate && award.votingEndDate) {
      const start = new Date(award.votingStartDate);
      const end = new Date(award.votingEndDate);

      if (award.votingStartTime) {
        const [hours, minutes] = award.votingStartTime.split(':');
        start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        start.setHours(0, 0, 0, 0);
      }

      if (award.votingEndTime) {
        const [hours, minutes] = award.votingEndTime.split(':');
        end.setHours(parseInt(hours), parseInt(minutes), 59, 999);
      } else {
        end.setHours(23, 59, 59, 999);
      }

      isVotingOpen = now >= start && now <= end;
    } else {
      isVotingOpen = true;
    }

    if (!isVotingOpen) {
      session.isActive = false;
      return {
        message: 'Voting has closed for this event. Your vote was not processed.',
        continueSession: false,
      };
    }

    const paymentReference = `USSD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const dummyEmail = `${phoneNumber}@ussd.pawavotes.com`;
    
    const vote = await Vote.create({
      awardId: session.data.awardId,
      categoryId: session.data.categoryId,
      nomineeId: session.data.nomineeId,
      voterEmail: dummyEmail,
      voterPhone: phoneNumber,
      numberOfVotes: session.data.numberOfVotes,
      amount: session.data.amount,
      paymentReference,
      paymentMethod: 'ussd',
      paymentStatus: 'pending',
    });
    const paystackResponse = await initiatePaystackCharge(
      dummyEmail,
      session.data.amount,
      phoneNumber,
      paymentReference
    );

    if (paystackResponse.success) {
      session.isActive = false;
      return {
        message: `Vote Submitted Successfully!\n\nApprove the payment prompt on ${phoneNumber} to complete your vote.\n\nYou will receive SMS confirmation.\n\nThank you for using PawaVotes!`,
        continueSession: false,
      };
    } else {
      await Vote.findByIdAndUpdate(vote._id, { paymentStatus: 'failed' });
      return {
        message: 'Payment initiation failed. Please try again later or contact support.',
        continueSession: false,
      };
    }
  } catch (error: any) {
    return {
      message: 'An error occurred while processing your vote. Please try again.',
      continueSession: false,
    };
  }
}

async function initiatePaystackCharge(
  email: string,
  amount: number,
  phoneNumber: string,
  reference: string
) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const amountInKobo = Math.round(amount * 100);
    const provider = detectMobileProvider(phoneNumber);

    if (!provider) {
      console.error('Could not detect mobile provider for:', phoneNumber);
      return {
        success: false,
        error: 'Unsupported mobile network',
      };
    }

    console.log(`Initiating ${provider.toUpperCase()} mobile money charge for ${phoneNumber}`);

    const response = await fetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        mobile_money: {
          phone: phoneNumber,
          provider: provider,
        },
        reference,
        currency: 'GHS',
      }),
    });

    const data = await response.json();
    return {
      success: data.status === true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function detectMobileProvider(phoneNumber: string): string | null {
  const cleanNumber = phoneNumber.replace(/[\s\-+]/g, '');
  let prefix = '';
  
  if (cleanNumber.startsWith('233')) {
    prefix = cleanNumber.substring(3, 5);
  } else if (cleanNumber.startsWith('0')) {
    prefix = cleanNumber.substring(1, 3);
  } else {
    prefix = cleanNumber.substring(0, 2);
  }
  const mtnPrefixes = ['24', '25', '53', '54', '55', '59'];

  const vodafonePrefixes = ['20', '50'];
  
  const airtelTigoPrefixes = ['26', '27', '56', '57'];

  if (mtnPrefixes.includes(prefix)) {
    return 'mtn';
  } else if (vodafonePrefixes.includes(prefix)) {
    return 'vod';
  } else if (airtelTigoPrefixes.includes(prefix)) {
    return 'tgo';
  }
  return 'mtn';
}
