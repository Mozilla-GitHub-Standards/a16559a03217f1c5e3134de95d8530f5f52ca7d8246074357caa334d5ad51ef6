const MULTIPLE_CHOICE = 0;
const CHECK_BOXES_WITH_FREE_ENTRY = 1;
const SCALE = 2;
const FREE_ENTRY = 3;
const CHECK_BOXES = 4;

exports.surveyInfo = {
  surveyId: "basic_panel_survey_2",
  surveyName: "Firefox 4 Beta User Background Survey",
  summary: "This survey will help us build a better picture of the majority "
    + "of Firefox 4 Beta user. This survey doesn't contain any personally "
    + "identifiable questions."
    + "Thank you for your time!",
  thumbnail: "",
  surveyExplanation: "<p>Thank you for joining the Firefox 4 Beta Program!</p> \
<p>Please help us build a better picture of our Beta users by completing this survey!  \
This survey doesn't contain any personally identifiable questions. \
It will be uploaded along with any user study data that you choose to submit. \
You can always use the button below to review or change your answers.</p>",
  thumbnail: "https://testpilot.mozillalabs.com/testcases/pilot-survey-thumbnail.png",
  minTPVersion: "1.0a1",
  versionNumber: 3,
  surveyQuestions:  [
   { question: "How long have you used Firefox?",
     type: MULTIPLE_CHOICE,
     choices: ["Less than 3 months","3 to 6 months","6 months to a year", "1 to 2 years",
                "2 to 3 years","3 to 5 years","More than 5 years"]},
  { question: "Do you use more than one browser in your daily life?",
    type: MULTIPLE_CHOICE,
    choices: ["No. I only use Firefox.",
              "Yes, I use other browsers besides Firefox."]},
   { question: "If you use other browsers besides Firefox, what are they?",
     type: CHECK_BOXES_WITH_FREE_ENTRY,
     choices: ["Chrome","Safari","Opera","Internet Explorer (all versions)"],
     free_entry: "Other" },
  { question: "If you use multiple browsers, what do you consider to be your primary browser?",
    type: MULTIPLE_CHOICE,
    choices: ["I don't use other browsers, only use Firefox"," Firefox","Chrome","Safari","Opera","Internet Explorer (all versions)"],
    free_entry: "Other" },
  { question: "What is your gender?",
    type: MULTIPLE_CHOICE,
    choices: ["Male", "Female"]},
  {question: "How old are you?",
   type: MULTIPLE_CHOICE,
   choices: ["Under 18",
             "18-25",
             "26-35",
             "36-45",
             "46-55",
             "Older than 55"]},
  { question: "How much time do you spend on the Web each day?",
    type: MULTIPLE_CHOICE,
    choices: ["Less than 1 hour",
              "1-2 hours",
              "2-4 hours",
              "4-6 hours",
              "6-8 hours",
              "8-10 hours",
              "More than 10 hours"]},
  { question: "How would you describe your computer/web skill level?",
    type: SCALE,
    scale_minimum: 1,
    scale_maximum: 10,
    min_label: "Not technical at all",
    max_label: "Highly technical"},
  { question: "Where do you usually access the Internet?",
    type: CHECK_BOXES_WITH_FREE_ENTRY,
    choices: ["Home", "Work", "School","Mobile"],
    free_entry: "Other" },
   { question: "What smartphone device are you currently using?",
     type: CHECK_BOXES_WITH_FREE_ENTRY,
     choices: ["Apple iPhone",
	       "Google Android (ex: Droid, HTC Hero)",
	       "Microsoft Windows Mobile (ex: HTC Imagio, Samsung Omnia)",
	       "Nokia Maemo ( ex: N900, N810)",
	       "Nokia Symbian (ex: N97, E71)",
               "Palm (ex: Pre, Treo)",
	       "RIM Blackberry",
               "I don't use a smartphone"],
    free_entry: "Other" },
   { question: "What are the main reason you use the Web?",
     type: CHECK_BOXES_WITH_FREE_ENTRY,
     choices: ["Work: coding related",
	       "Work: non-coding related",
	       "School",
	       "Personal life assistance",
	       "Communication",
	       "Socializing",
	       "Entertainment"],
    free_entry: "Other" },
   { question: "What are your most frequently visited websites? ",
     type: CHECK_BOXES_WITH_FREE_ENTRY,
     choices: ["Search engines",
	       "Video sites",
	       "News sites",
	       "Social networking sites",
	       "Browser based games",
	       "Shopping",
	       "Paying bills and online banking",
	       "File download sites",
	       "Webmail",
	       "Forums",
	       "Adult pages",
	       "Gambling and online betting",
               "Online word processing: Google Docs, Spreadsheets"],
    free_entry: "Other" },
{ question: "How do you find out about the latest computer and technology news?",
     type: CHECK_BOXES_WITH_FREE_ENTRY,
     choices: ["Online news sources: Google News, CNN,etc.",
	       "Online blogs: tech blogs, news blogs, etc.",
	       "Offline news sources: printed newspapers, magazines,etc.",
	       "Someone you know: a coworker, friend or family member,etc.",
	       "Advertisements",
	       "Social media: Facebook, Twitter, Ning, etc."],
    free_entry: "Other" },
  {question:"How would you describe yourself as a web user?",
   type: FREE_ENTRY}
  ]
};
