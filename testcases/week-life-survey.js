const MULTIPLE_CHOICE = 0;
const CHECK_BOXES_WITH_FREE_ENTRY = 1;
const SCALE = 2;
const FREE_ENTRY = 3;
const CHECK_BOXES = 4;

exports.surveyInfo = {
  surveId: "week_life_survey",
  surveyName: "A week in the life of a Browser",
  uploadWithExperiment: 2,
  surveyQuestions:  [
   { question: "How long have you used Firefox?",
     type: MULTIPLE_CHOICE,
     choices: ["less than a year", "1-2 years", "2-4 years",
               "more than 4 years", "don't remember"] },
  { question: "Do you use multiple browsers at the same time in daily life?",
    type: MULTIPLE_CHOICE,
    choices: ["No. I only use Firefox.",
              "Yes, I use other browsers besides Firefox."]},
   { question: "If you use other browsers besides Firefox, what are they?",
     type: CHECK_BOXES_WITH_FREE_ENTRY,
     choices: ["IE 8", "Chrome", "Safari", "IE7"],
     free_entry: "Other" },
  { question: "If you use multiple browser at the same time, what are reasons to do so?",
    type: CHECK_BOXES_WITH_FREE_ENTRY,
    choices: [ "My job requires me working with several browsers.",
               "I like different functions from different browsers.",
               "Browsers are installed on different computers that I use for different purpose.",
               "It makes me look cooler to know all great browsers."],
    free_entry: "Other" },
  { question: "How would you describe your computer/web skill level?",
    type: SCALE,
    scale_minimum: 1,
    scale_maximum: 10,
    min_label: "Know nothing.",
    max_label: "Super good!"
  },
  { question: "Your gender?",
    type: MULTIPLE_CHOICE,
    choices: ["Male", "Female"]},
  { question: "How much time do you spend on the Web per day?",
    type: MULTIPLE_CHOICE,
    choices: ["Less than 1 hour",
              "1-4 hours",
              "4-8 hours",
              "8-12 hours",
              "More than 12 hours"]},
  {question: "How old are you?",
   type: MULTIPLE_CHOICE,
   choices: ["under 18",
             "18-25",
             "26-35",
             "36-45",
             "46-55",
             "older than 55"]}
  ]
};