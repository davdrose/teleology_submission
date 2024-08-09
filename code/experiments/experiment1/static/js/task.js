/* task.js
 *
 * This file holds the main experiment code.
 *
 * Requires:
 *   config.js
 *   psiturk.js
 *   utils.js
 */

// Create and initialize the experiment configuration object
var $c = new Config(condition, counterbalance);

// Initalize psiturk object
var psiTurk = new PsiTurk(uniqueId, adServerLoc);

// Preload the HTML template pages that we need for the experiment
psiTurk.preloadPages($c.pages);

// Objects to keep track of the current phase and state
var CURRENTVIEW;
var STATE;
var n_comprehension_attempts = 0;


/************************
 * BOT CHECK
 *************************/

var BotCheck = function() {
	$(".slide").hide();

	// Initialize a challenge choice value
	var challenge_choice = Math.floor(Math.random() * 6) + 1;

	// Text for image html
	var image_html = '<img id="challenge_img" src="static/images/bot_questions/challenge' + challenge_choice + '.png"">';

	var check_against = ["freddie", "gina", "mohammed", "juan", "elise", "kayla"]

	$("#challenge_container").html(image_html);
	$("#bot_check_button").prop("disabled", true);

	$("#bot_text").on("keyup", function() {
		if ($("#bot_text").val().length != 0) {
			$("#bot_check_button").prop("disabled", false);
		} else {
			$("#bot_check_button").prop("disabled", true);
		}
	});

	$("#bot_check_button").click(function() {
		var resp = $("#bot_text").val().toLowerCase().trim();
		$c.check_responses.push(resp);


		// Reset textarea and event handlers
		$("#bot_text").val("");
		$("#bot_text").off()
		$("#bot_check_button").off()

		if (resp == check_against[challenge_choice - 1]) {
			// Upon success, record the persons responses
			// May want to record as we go? But I guess if the bot is endlessly failing the check
			// then we just won't get their data at the end?
			psiTurk.recordUnstructuredData("botcheck_responses", $c.check_responses);
			CURRENTVIEW = BotCheckSuccess();
		} else {
			CURRENTVIEW = new BotCheckFail();
		}
	});

	$("#botcheck").fadeIn($c.fade);
}

/*************************
 * Bot check success
 *************************/
var BotCheckSuccess = function() {
	$(".slide").hide();
	$("#botcheck_pass").fadeIn($c.fade);

	$("#botcheck_pass_button").click(function() {
		CURRENTVIEW = new Instructions();
	})
}

/*************************
 * Bot check fail
 *************************/
var BotCheckFail = function() {
	// Show the slide
	$(".slide").hide();
	$("#botcheck_fail").fadeIn($c.fade);

	$('#botcheck_fail_button').click(function() {
		$('#botcheck_fail_button').unbind();
		CURRENTVIEW = new BotCheck();
	});
}

/*************************
 * INSTRUCTIONS
 *************************/

var Instructions = function() {
	var instruction_counter = 0;

	var instruction_slide = function(){
		$(".slide").hide();
		instruction_counter = instruction_counter + 1;
		console.log("instruction_counter", instruction_counter);
		var slide = $("#instructions-" + instruction_counter)
		slide.fadeIn($c.fade);
	}

	instruction_slide();

	// Set click handler to next button in instructions slide
	$(".instructions").click(function() {
		if  (instruction_counter < 3){
			instruction_slide();
		}else{
			CURRENTVIEW = new Comprehension();
		}
	});
};

/*****************
 *  COMPREHENSION CHECK QUESTIONS*
 *****************/

var Comprehension = function() {

	// Hide everything else
	$(".slide").hide();

	// Show the comprehension check section
	$("#comprehension-check").fadeIn($c.fade);

	// disable button initially
	$('#comp-cont').prop('disabled', true);

	// set handler. On any change to the comprehension question inputs, enable
	// the continue button if the number of responses is at least 1

	$('.compQ').change(function() {
		var q1_check = $('input[name=comprehension_radio1]:checked').length > 0
		var q2_check = $('input[name=comprehension_radio2]:checked').length > 0
		if (q1_check && q2_check) {
			$('#comp-cont').prop('disabled', false);
		} else {
			$('#comp-cont').prop('disabled', true);
		}
	});

	//update comprehension check counter
	n_comprehension_attempts = n_comprehension_attempts + 1;

	// set handler. On click of continue button, check whether the input value
	// matches the given answer. If it does, continue, otherwise to got comprehension check fail
	$('#comp-cont').click(function() {
		var q1_resp = $('input[name=comprehension_radio1]:checked').val();
		var q2_resp = $('input[name=comprehension_radio2]:checked').val();

		// correct answers
		var q1_answer = "42";
		var q2_answer = "4";

		if ((q1_resp == q1_answer) && (q2_resp == q2_answer)) {
			CURRENTVIEW = new ComprehensionCheckPass();
		} else {
			$('input[name=comprehension_radio1]').prop('checked', false);
			$('input[name=comprehension_radio2]').prop('checked', false)
			$('#comp-cont').off();
			$('.compQ').off();
			CURRENTVIEW = new ComprehensionCheckFail();
		}
	});
}

/*****************
 * COMPREHENSION PASS SCREEN*
 ******************/
var ComprehensionCheckPass = function() {
	$(".slide").hide();
	$("#comprehension_check_pass").fadeIn($c.fade);

	$("#comprehension_pass").click(function() {
		psiTurk.recordUnstructuredData('n_comprehension_attempts', n_comprehension_attempts);
		CURRENTVIEW = new TestPhase();
	})
}

/*****************
 *  COMPREHENSION FAIL SCREEN*
 *****************/

var ComprehensionCheckFail = function() {
	// Show the slide
	$(".slide").hide();
	$("#comprehension_check_fail").fadeIn($c.fade);
	$('#inst1_cont').unbind();

	$('#comprehension_fail').click(function() {
		CURRENTVIEW = new Instructions();
		$('#comprehension_fail').unbind();
	});
}

/*****************
 *  TRIAL       *
 *****************/

var TestPhase = function() {
	// Initialize relevant TestPhase values
	this.trialinfo;
	this.response;

	// hide all displayed html
	$('.slide').hide();
	$("#trial").fadeIn($c.fade);

	// assign response buttons
	for (var i = 0; i < $c.feature_categories.length; i++) {
		$("#response_button" + (i + 1)).text($c.feature_categories[i])
	}
	psiTurk.recordUnstructuredData('response_button_order', $c.feature_categories);


	// Define the trial method which runs recursively
	this.run_trial = function() {
		// If we have exhausted all the trials, transition to next phase and close down the function,
		// else if we have reached the attention check point, run the attention check
		// Otherwise run the trial

		// record current time
		var start = performance.now();

		if (STATE.index >= $c.features.length) {
			CURRENTVIEW = new Demographics();
			return
		} else {

			// STATE.index

			// get the appropriate trial info
			$("#name_text").html($c.name_text)
			$("#feature_text").html($c.feature_text)
			$("#item").html($c.features[STATE.index])
			$("#thing_name").html($c.names[STATE.index])
			$("#question").html($c.question)

			// update the prgoress bar. Defined in utils.js
			update_progress(STATE.index, $c.features.length);
		};

		$('#trial').fadeIn($c.fade);
		tPhase = this;

		var enableButtons = function() {
    		$(".response_button").removeAttr("disabled");
		}

		$(".response_button").click(function() {
			var response_time = performance.now() - start;

			$(".response_button").attr("disabled", true);
    		setTimeout(function() { enableButtons() }, 2000);

			//find out the text of the button that was pressed and store this as the response
			var response = $(this).text()

			var data = {
				'item': $c.features[STATE.index],
				'response': response,
				'time': response_time
			}

			psiTurk.recordTrialData(data);
			$(".response_button").unbind();

			// increment the state
			STATE.set_index(STATE.index + 1);
			tPhase.run_trial();
			return
		});
	};
	this.run_trial()
};


/************************
 * Story Comprehension
 *************************/
// var StoryComp = function() {
//     $(".slide").hide();
//     $("#story_comp_check").fadeIn($c.fade);
//     $("#story_comp_cont").prop('disabled', true);
//     $(".compS").click(function () {
//       $("#story_comp_cont").prop('disabled', false)
//       });
//     $("#story_comp_cont").click(function () {
//         var storycomp = $('input[name=comprehension_radio_story]:checked').val();
//         psiTurk.recordUnstructuredData('storycomp', storycomp)
//         CURRENTVIEW = new Demographics();
//     })
// }



/************************
 * Demographics
 *************************/

// Make demographic field entry and prefer not to say mutually exclusive
var OnOff = function(demo_type) {
	// If you click the NA button, empty the field
	$('#' + demo_type + '_na').click(function() {
		$('#' + demo_type + '_answer').val("");
	});

	// If you enter text into the field entry, uncheck prefer not to say
	$('#' + demo_type + '_answer').on('keyup', function() {
		if ($('#' + demo_type + '_answer').val() != "") {
			$('#' + demo_type + '_na').prop('checked', false);
		}
	});
}

var Demographics = function() {

	var that = this;

	// Show the slide
	$(".slide").hide();
	$("#demographics").fadeIn($c.fade);

	//disable button initially
	$('#trial_finish').prop('disabled', true);

	//checks whether all questions were answered
	$('.demoQ').change(function() {
		var lang_check = $('input[name=language]').val() != "" || $('input[name=language]:checked').length > 0
		var age_check = $('input[name=age]').val() != "" || $('input[name=age]:checked').length > 0
		var gen_check = $('input[name=gender]').val() != "" || $('input[name=gender]:checked').length > 0
		var race_check = $('input[name=race]').val() != "" || $('input[name=race]:checked').length > 0
		var eth_check = $('input[name=ethnicity]:checked').length > 0
		if (lang_check && age_check && gen_check && race_check && eth_check) {
			$('#trial_finish').prop('disabled', false)
		} else {
			$('#trial_finish').prop('disabled', true)
		}
	});

	// Make the field entries turn off if prefer not to say is checkd
	// (and vice versa)
	OnOff('language')
	OnOff('age')
	OnOff('gender')
	OnOff('race')

	this.finish = function() {

		// Show a page saying that the HIT is resubmitting, and
		// show the error page again if it times out or error
		var resubmit = function() {
			$(".slide").hide();
			$("#resubmit_slide").fadeIn($c.fade);

			var reprompt = setTimeout(prompt_resubmit, 10000);
			psiTurk.saveData({
				success: function() {
					clearInterval(reprompt);
					finish();
				},
				error: prompt_resubmit
			});
		};

		// Prompt them to resubmit the HIT, because it failed the first time
		var prompt_resubmit = function() {
			$("#resubmit_slide").click(resubmit);
			$(".slide").hide();
			$("#submit_error_slide").fadeIn($c.fade);
		};

		// Render a page saying it's submitting
		psiTurk.preloadPages(["submit.html"])
		psiTurk.showPage("submit.html");
		psiTurk.saveData({
			success: psiTurk.completeHIT,
			error: prompt_resubmit
		});
	}; //this.finish function end

	$('#trial_finish').click(function() {
		var feedback = $('textarea[name = feedback]').val();
		var language = $('input[name=language]').val();
		var age = $('input[name=age]').val();
		var gender = $('input[name=gender]').val();
		var race = $('input[name=race]').val();
		var ethnicity = $('input[name=ethnicity]:checked').val();

		psiTurk.recordUnstructuredData('feedback', feedback);
		psiTurk.recordUnstructuredData('language', language);
		psiTurk.recordUnstructuredData('age', age);
		psiTurk.recordUnstructuredData('gender', gender);
		psiTurk.recordUnstructuredData('race', race);
		psiTurk.recordUnstructuredData('ethnicity', ethnicity)
		that.finish();
	});
};


// --------------------------------------------------------------------
// --------------------------------------------------------------------

/*******************
 * Run Task
 ******************/

$(document).ready(function() {
	// Load the HTML for the trials
	psiTurk.showPage("trial.html");

	// Record various unstructured data
	psiTurk.recordUnstructuredData("condition", condition);
	psiTurk.recordUnstructuredData("counterbalance", counterbalance);

	// Start the experiment
	STATE = new State();
	//CURRENTVIEW = new StoryComp();
	CURRENTVIEW = new BotCheck();
	// CURRENTVIEW = new TestPhase();
	// CURRENTVIEW = new Demographics();
	// CURRENTVIEW = new Instructions();
	// CURRENTVIEW = new Comprehension();
});
