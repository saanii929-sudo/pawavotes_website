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
    // Arkesel USSD format
    const { sessionID, userID, newSession, msisdn, userData, network } = body;
    
    // Map Arkesel fields to our internal format
    const sessionId = sessionID;
    const phoneNumber = msisdn;
    const text = userData || '';
    
    let session = await UssdSession.findOne({ sessionId });
    
    // Check if this is a new session
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

    // Convert response to Arkesel format
    const arkeselResponse = {
      sessionID: sessionId,
      userID: userID || 'CP9VG7Y5TN_dNri2', // Arkesel USERID
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

  switch (step) {
    case 'welcome':
      return await showWelcome(session);

    case 'select_award':
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
      return { message: 'Invalid session. Please try again.', continueSession: false };
  }
}

async function showWelcome(session: any) {
  const awards = await Award.find({ status: 'published' })
    .select('name votingStartDate votingEndDate votingStartTime votingEndTime')
    .limit(10)
    .lean();
  
  if (awards.length === 0) {
    return { message: 'No active awards available at the moment.', continueSession: false };
  }

  const now = new Date();
  const activeAwards = [];

  for (const award of awards) {
    // Check if award has active stages
    const Stage = (await import('@/models/Stage')).default;
    const activeStage = await Stage.findOne({
      awardId: award._id,
      status: 'active',
      stageType: 'voting',
    })
      .select('startDate endDate startTime endTime')
      .lean();

    let isActive = false;

    // If award has an active voting stage, check stage dates
    if (activeStage) {
      const stageStart = new Date(activeStage.startDate);
      const stageEnd = new Date(activeStage.endDate);

      // Add time if available
      if (activeStage.startTime) {
        const [hours, minutes] = activeStage.startTime.split(':');
        stageStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      if (activeStage.endTime) {
        const [hours, minutes] = activeStage.endTime.split(':');
        stageEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      isActive = now >= stageStart && now <= stageEnd;
    } else {
      // Fallback to award's voting period if no active stage
      if (award.votingStartDate && award.votingEndDate) {
        const start = new Date(award.votingStartDate);
        const end = new Date(award.votingEndDate);

        // Add time if available
        if (award.votingStartTime) {
          const [hours, minutes] = award.votingStartTime.split(':');
          start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        if (award.votingEndTime) {
          const [hours, minutes] = award.votingEndTime.split(':');
          end.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        isActive = now >= start && now <= end;
      }
    }

    if (isActive) {
      activeAwards.push(award);
    }
  }

  if (activeAwards.length === 0) {
    return { message: 'No awards are currently open for voting.', continueSession: false };
  }

  let menu = 'Welcome to PawaVotes!\nSelect an award to vote:\n\n';
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
    return { message: 'Invalid selection. Please try again.', continueSession: false };
  }

  const selectedAward = awards[selectedIndex];
  session.data.awardId = selectedAward._id.toString();
  session.data.awardName = selectedAward.name;
  const categories = await Category.find({
    awardId: selectedAward._id,
    status: 'published',
  })
    .select('name')
    .limit(10)
    .lean();

  if (categories.length === 0) {
    return { message: 'No categories available for this award.', continueSession: false };
  }

  let menu = `${selectedAward.name}\nSelect a category:\n\n`;
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
    return { message: 'Invalid selection. Please try again.', continueSession: false };
  }

  const selectedCategory = categories[selectedIndex];
  session.data.categoryId = selectedCategory._id.toString();
  session.data.categoryName = selectedCategory.name;

  // Ask user how they want to select nominee
  session.currentStep = 'nominee_method';

  return {
    message: `${selectedCategory.name}\n\nHow would you like to vote?\n\n1. Enter Nominee Code\n2. Browse Nominees`,
    continueSession: true,
  };
}

async function handleNomineeMethod(session: any, userInput: string) {
  if (userInput === '1') {
    // User wants to enter nominee code
    session.currentStep = 'enter_nominee_code';
    return {
      message: `Enter the Nominee Code\n(e.g., GMA001):`,
      continueSession: true,
    };
  } else if (userInput === '2') {
    // User wants to browse nominees
    const nominees = await Nominee.find({
      categoryId: session.data.categoryId,
      status: 'published',
      nominationStatus: 'accepted',
    })
      .select('name nomineeCode')
      .limit(10)
      .lean();

    if (nominees.length === 0) {
      return { message: 'No nominees available for this category.', continueSession: false };
    }

    let menu = `${session.data.categoryName}\nSelect a nominee:\n\n`;
    nominees.forEach((nominee, index) => {
      const code = nominee.nomineeCode ? ` (${nominee.nomineeCode})` : '';
      menu += `${index + 1}. ${nominee.name}${code}\n`;
    });

    session.currentStep = 'select_nominee';
    session.data.nominees = nominees;

    return { message: menu, continueSession: true };
  } else {
    return { message: 'Invalid selection. Please try again.', continueSession: false };
  }
}

async function handleNomineeCodeEntry(session: any, userInput: string) {
  const nomineeCode = userInput.trim().toUpperCase();

  // Find nominee by code
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
      message: `Nominee code "${nomineeCode}" not found in this category. Please check the code and try again.`,
      continueSession: false,
    };
  }

  // Set nominee data
  session.data.nomineeId = nominee._id.toString();
  session.data.nomineeName = nominee.name;
  session.data.nomineeCode = nomineeCode;

  // Get voting price
  const award = await Award.findById(session.data.awardId).select('pricing').lean();
  const pricePerVote = award?.pricing?.votingCost || 0.5;

  session.currentStep = 'enter_votes';

  return {
    message: `Voting for:\n${nominee.name} (${nomineeCode})\n\nGHS ${pricePerVote} per vote\n\nEnter number of votes (1-100):`,
    continueSession: true,
  };
}

async function handleNomineeSelection(session: any, userInput: string) {
  const selectedIndex = parseInt(userInput) - 1;
  const nominees = session.data.nominees;

  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= nominees.length) {
    return { message: 'Invalid selection. Please try again.', continueSession: false };
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
    message: `Voting for:\n${selectedNominee.name}${codeDisplay}\n\nGHS ${pricePerVote} per vote\n\nEnter number of votes (1-100):`,
    continueSession: true,
  };
}

async function handleVoteQuantity(session: any, userInput: string) {
  const numberOfVotes = parseInt(userInput);
  if (isNaN(numberOfVotes) || numberOfVotes < 1 || numberOfVotes > 100) {
    return { message: 'Invalid number. Please enter between 1 and 100.', continueSession: false };
  }
  const award = await Award.findById(session.data.awardId).select('pricing').lean();
  const pricePerVote = award?.pricing?.votingCost || 0.5;
  const amount = numberOfVotes * pricePerVote;

  session.data.numberOfVotes = numberOfVotes;
  session.data.amount = amount;
  session.currentStep = 'confirm';

  const codeDisplay = session.data.nomineeCode ? ` (${session.data.nomineeCode})` : '';
  return {
    message: `Confirm your vote:\n\nNominee: ${session.data.nomineeName}${codeDisplay}\nVotes: ${numberOfVotes}\nAmount: GHS ${amount.toFixed(2)}\n\n1. Confirm & Pay\n2. Cancel`,
    continueSession: true,
  };
}

async function handleConfirmation(session: any, userInput: string, phoneNumber: string) {
  if (userInput === '2') {
    session.isActive = false;
    return { message: 'Vote cancelled.', continueSession: false };
  }
  if (userInput !== '1') {
    return { message: 'Invalid selection.', continueSession: false };
  }

  try {
    // Validate that voting is still open before processing payment
    const award = await Award.findById(session.data.awardId)
      .select('votingStartDate votingEndDate votingStartTime votingEndTime')
      .lean();

    if (!award) {
      return { message: 'Award not found.', continueSession: false };
    }

    const now = new Date();
    let isVotingOpen = false;

    // Check if award has active voting stage
    const Stage = (await import('@/models/Stage')).default;
    const activeStage = await Stage.findOne({
      awardId: award._id,
      status: 'active',
      stageType: 'voting',
    })
      .select('startDate endDate startTime endTime')
      .lean();

    if (activeStage) {
      const stageStart = new Date(activeStage.startDate);
      const stageEnd = new Date(activeStage.endDate);

      if (activeStage.startTime) {
        const [hours, minutes] = activeStage.startTime.split(':');
        stageStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      if (activeStage.endTime) {
        const [hours, minutes] = activeStage.endTime.split(':');
        stageEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      isVotingOpen = now >= stageStart && now <= stageEnd;
    } else {
      // Fallback to award's voting period
      if (award.votingStartDate && award.votingEndDate) {
        const start = new Date(award.votingStartDate);
        const end = new Date(award.votingEndDate);

        if (award.votingStartTime) {
          const [hours, minutes] = award.votingStartTime.split(':');
          start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        if (award.votingEndTime) {
          const [hours, minutes] = award.votingEndTime.split(':');
          end.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        isVotingOpen = now >= start && now <= end;
      }
    }

    if (!isVotingOpen) {
      session.isActive = false;
      return {
        message: 'Voting has closed for this award. Your vote was not processed.',
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
        message: `Vote submitted!\n\nApprove the payment prompt on your phone (${phoneNumber}) to complete.\n\nYou will receive SMS confirmation from Paystack.`,
        continueSession: false,
      };
    } else {
      await Vote.findByIdAndUpdate(vote._id, { paymentStatus: 'failed' });
      return {
        message: 'Payment initiation failed. Please try again later.',
        continueSession: false,
      };
    }
  } catch (error: any) {
    return {
      message: 'An error occurred. Please try again.',
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
