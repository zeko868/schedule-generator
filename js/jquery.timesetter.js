/**
 * Author: Sandun Angelo Perera & Ben Scobie
 * Date: 2017-03-17
 * Description: jquery-timesetter is a jQuery plugin which generates a UI component which is useful to take user inputs or 
 * to display time values with hour and minutes in a friendly format. UI provide intutive behaviours for better user experience 
 * such as validations in realtime and keyboard arrow key support.
 * Dependency: 
 *              jQuery-2.2.4.min.js
 *              bootstrap css: https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css
 * 
 * https://github.com/benscobie/jquery-timesetter
 */

(function ($) {
    /**
	 * Support function to construct string with padded with a given character to the left side.
	 */
    function padLeft(value, l, c) {
        return Array(l - value.toString().length + 1).join(c || " ") + value.toString();
    };

    /**
     * Initialize all the time setter controls in the document.
     */
    $.fn.timesetter = function (options) {
        var self = this;

        /**
         * unit is taken out from self.settings to make it globally affect as currently user is concern about which unit to change.
         */
        var unit = "minutes"; /* minutes or hours */

        /**
         * plugin UI html template
         */
        var htmlTemplate =
            '<div class="divTimeSetterContainer">' +
            '<div class="timeValueBorder">' +
            '<input id="txtHours" type="text" class="timePart hours" data-unit="hours" autocomplete="off" />' +
            '<span class="hourSymbol"></span>' +
            '<span class="timeDelimiter">:</span>' +
            '<input id="txtMinutes" type="text" class="timePart minutes" data-unit="minutes" autocomplete="off" />' +
            '<span class="minuteSymbol"></span>' +
            '<div class="button-time-control">' +
            '<div id="btnUp" type="button" data-direction="increment" class="updownButton">' +
            '<i class="glyphicon glyphicon-triangle-top"></i>' +
            '</div>' +
            '<div id="btnDown" type="button" data-direction="decrement" class="updownButton">' +
            '<i class="glyphicon glyphicon-triangle-bottom"></i>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<label class="postfix-position"></label>' +
            '</div>';

        /**
         * get max length based on input field options max value.
         */
        var getMaxLength = function (unitSettings) {
            return unitSettings.max.toString().length;
        };

        /**
         * save the element options' values as a data value within the element.
         */
        var saveOptions = function (container, options) {
            if (options) {
                self.settings = $.extend(self.settings, options);
            }
            else {
                self.settings = self.getDefaultSettings();
            }
            $(container).data('options', self.settings);
            return self.settings;
        };

        /**
         * load the element's option values saved as data values.
         */
        var loadOptions = function (container) {
            var savedOptions = $(container).data('options');
            if (savedOptions) {
                self.settings = $.extend(self.settings, $(container).data('options'));
            }
            else {
                self.settings = self.getDefaultSettings();
            }
            return self.settings;
        }

        /**
        * Capture the time unit which is about to update from events.
        */
        var unitChanged = function (sender) {
            var container = $(sender).parents(".divTimeSetterContainer");
            loadOptions(container);

            unit = $(sender).data("unit");

            self.settings.inputHourTextbox = container.find('#txtHours');
            self.settings.inputMinuteTextbox = container.find('#txtMinutes');

            saveOptions(container, self.settings);
        };

        /**
         * Change the time setter values from UI events.
         */
        var updateTimeValue = function (sender) {
            var container = $(sender).parents(".divTimeSetterContainer");
            loadOptions(container);

            self.settings.inputHourTextbox = container.find('#txtHours');
            self.settings.inputMinuteTextbox = container.find('#txtMinutes');

            self.settings.hour.value = parseInt(self.settings.inputHourTextbox.val());
            self.settings.minute.value = parseInt(self.settings.inputMinuteTextbox.val());

            self.settings.direction = $(sender).data("direction");

            // validate hour and minute values
            if (isNaN(self.settings.hour.value)) {
                self.settings.hour.value = self.settings.hour.min;
            }

            if (isNaN(self.settings.minute.value)) {
                self.settings.minute.value = self.settings.minute.min;
            }

            // update time setter by changing hour value
            if (unit === "hours") {
                var oldHourValue = parseInt($(self.settings.inputHourTextbox).val().trim());
                var newHourValue = 0;

                if (self.settings.direction === "decrement") {
                    newHourValue = oldHourValue - self.settings.hour.step;

                    // tolerate the wrong step number and move to a valid step
                    if ((newHourValue % self.settings.hour.step) > 0) {
                        newHourValue = (newHourValue - (newHourValue % self.settings.hour.step)); // set to the previous adjacent step
                    }

                    if (newHourValue <= self.settings.hour.min) {
                        newHourValue = self.settings.hour.min;
                    }
                }
                else if (self.settings.direction === "increment") {
                    newHourValue = oldHourValue + self.settings.hour.step;

                    // tolerate the wrong step number and move to a valid step
                    if ((newHourValue % self.settings.hour.step) > 0) {
                        newHourValue = (newHourValue - (newHourValue % self.settings.hour.step)); // set to the previous adjacent step
                    }

                    if (newHourValue >= self.settings.hour.max) {
                        newHourValue = self.settings.hour.max - self.settings.hour.step;
                    }
                }

                $(self.settings.inputHourTextbox).val(padLeft(newHourValue.toString(), getMaxLength(self.settings.hour), self.settings.numberPaddingChar));
                $(container).attr("data-hourvalue", newHourValue);
                $(container).attr("data-minutevalue", newMinuteValue);
                $(self.settings.inputHourTextbox).trigger("change").select();
            }
            else if (unit === "minutes") // update time setter by changing minute value
            {
                var oldHourValue = self.settings.hour.value;
                var newHourValue = oldHourValue;

                var oldMinuteValue = self.settings.minute.value;
                var newMinuteValue = oldMinuteValue;

                if (self.settings.direction === "decrement") {
                    newMinuteValue = oldMinuteValue - self.settings.minute.step;

                    // tolerate the wrong step number and move to a valid step
                    if ((newMinuteValue % self.settings.minute.step) > 0) {
                        newMinuteValue = (newMinuteValue - (newMinuteValue % self.settings.minute.step)); // set to the previuos adjacent step
                    }

                    if (newHourValue <= self.settings.hour.min &&
                        oldMinuteValue <= self.settings.minute.min) {
                        newHourValue = self.settings.hour.min;
                        newMinuteValue = self.settings.minute.min;
                    }
                }
                else if (self.settings.direction === "increment") {
                    newMinuteValue = oldMinuteValue + self.settings.minute.step;

                    // tolerate the wrong step number and move to a valid step
                    if ((newMinuteValue % self.settings.minute.step) > 0) {
                        newMinuteValue = (newMinuteValue - (newMinuteValue % self.settings.minute.step)); // set to the previous adjacent step
                    }

                    if (newHourValue >= (self.settings.hour.max - self.settings.hour.step) &&
                        oldMinuteValue >= (self.settings.minute.max - self.settings.minute.step)) {
                        newHourValue = self.settings.hour.max - self.settings.hour.step;
                        newMinuteValue = self.settings.minute.max - self.settings.minute.step;
                    }
                }

                // change the hour value when the minute value exceed its limits
                if (newMinuteValue >= self.settings.minute.max && newHourValue != self.settings.hour.max && newMinuteValue) {
                    newMinuteValue = self.settings.minute.min;
                    newHourValue = oldHourValue + self.settings.hour.step;
                }
                else if (newMinuteValue < self.settings.minute.min && oldHourValue >= self.settings.hour.step) {
                    newMinuteValue = self.settings.minute.max - self.settings.minute.step;
                    newHourValue = oldHourValue - self.settings.hour.step;
                }
                else if (newMinuteValue < self.settings.minute.min && oldHourValue < self.settings.hour.step) {
                    newMinuteValue = self.settings.minute.min;
                    newHourValue = self.settings.hour.min;
                }

                $(self.settings.inputHourTextbox).val(padLeft(newHourValue.toString(), getMaxLength(self.settings.hour), self.settings.numberPaddingChar));
                $(self.settings.inputMinuteTextbox).val(padLeft(newMinuteValue.toString(), getMaxLength(self.settings.minute), self.settings.numberPaddingChar));
                $(container).attr("data-hourvalue", newHourValue);
                $(container).attr("data-minutevalue", newMinuteValue);
                $(self.settings.inputMinuteTextbox).trigger("change").select();

                saveOptions(container, self.settings);
            }

            self.trigger('updated.timesetter',
                [
                    {
                        minute: self.getMinutesValue(),
                        hour: self.getHoursValue()
                    }
                ]
            );
        };

        /**
         * Change the time setter values from arrow up/down key events
         */
        var updateTimeValueByArrowKeys = function (sender, event) {
            var container = $(sender).parents(".divTimeSetterContainer");
            loadOptions(container);

            var senderUpBtn = $(container).find("#btnUp");
            var senderDownBtn = $(container).find("#btnDown");
            switch (event.which) {
                case 13: // return
                    break;

                case 37: // left
                    break;

                case 38: // up
                    senderUpBtn.click();
                    break;

                case 39: // right
                    break;

                case 40: // down
                    senderDownBtn.click();
                    break;

                default: return; // exit this handler for other keys
            }
            event.preventDefault(); // prevent the default action (scroll / move caret)            
            saveOptions(container, self.settings);

            $(sender).select();
        };

        /**
         * apply sanitization to the input value and apply corrections.
         */
        var formatInput = function (e) {
            var element = $(e.target);

            var container = $(element).parents(".divTimeSetterContainer");
            loadOptions(container);

            var unitSettings;

            if (unit === "hours") {
                unitSettings = self.settings.hour;
            }
            else if (unit === "minutes") {
                unitSettings = self.settings.minute;
            }

            if (!$.isNumeric(element.val())) {
                $(element).val(padLeft(unitSettings.min.toString(), getMaxLength(unitSettings), self.settings.numberPaddingChar));
                return false;
            }

            var value = parseInt(parseFloat(element.val()));

            // tolerate the wrong step number and move to a valid step
            // ex: user enter 20 while step is 15, auto correct to 15
            if (value >= unitSettings.max) {
                value = unitSettings.max - unitSettings.step;
                $(element).val(padLeft(value.toString(), getMaxLength(unitSettings), self.settings.numberPaddingChar));
                return false;
            }
            else if (value <= unitSettings.min) {
                $(element).val(padLeft(unitSettings.min.toString(), getMaxLength(unitSettings), self.settings.numberPaddingChar));
                return false;
            }
            else if (padLeft(value.toString(), getMaxLength(unitSettings), self.settings.numberPaddingChar) !== $(element).val()) {
                $(element).val(padLeft(value.toString(), getMaxLength(unitSettings), self.settings.numberPaddingChar));
                return false;
            }
            else if ((value % unitSettings.step) > 0) {
                value = (value - (value % unitSettings.step)); // set to the previous adjacent step
                $(element).val(padLeft(value.toString(), getMaxLength(unitSettings), self.settings.numberPaddingChar));
                return false;
            }

            //if the letter is not digit then display error and don't type anything
            if (e.which != 8 && e.which != 0 && (e.which < 48 || e.which > 57)) {
                //display error message
                return false;
            }

            if (value >= Math.pow(10, getMaxLength(unitSettings))) {
                $(element).val(padLeft((Math.pow(10, getMaxLength(unitSettings)) - 1).toString(), getMaxLength(unitSettings), self.settings.numberPaddingChar));
                return false;
            }
        };

        /**
         * get the hour value from the control.
         */
        self.getHoursValue = function () {
            var container = $(this).find(".divTimeSetterContainer");
            var txtHour = $(container).find("#txtHours");
            if ($.isNumeric(txtHour.val())) {
                return parseInt(txtHour.val());
            }
            return self.settings.hour.min;
        };

        /**
         * get the minute value from the control.
         */
        self.getMinutesValue = function () {
            var container = $(this).find(".divTimeSetterContainer");
            var txtMinute = $(container).find("#txtMinutes");
            if ($.isNumeric(txtMinute.val())) {
                return parseInt(txtMinute.val());
            }
            return self.settings.minute.min;
        };

        /**
         * get the total number of minutes from the control.
         */
        self.getTotalMinutes = function () {
            var container = $(this).find(".divTimeSetterContainer");
            var txtHour = $(container).find("#txtHours");
            var txtMinute = $(container).find("#txtMinutes");

            var hourValue = 0;
            var minuteValue = 0;

            if ($.isNumeric(txtHour.val()) && $.isNumeric(txtMinute.val())) {
                hourValue = parseInt(txtHour.val());
                minuteValue = parseInt(txtMinute.val());
            }
            return ((hourValue * 60) + minuteValue);
        };

        /**
         * get the postfix display text.
         */
        self.getPostfixText = function () {
            var container = $(this).find(".divTimeSetterContainer");
            return container.find(".postfix-position").text();
        };

        /**
         * set the hour value to the control.
         */
        self.setHour = function (hourValue) {
            var container = $(this).find(".divTimeSetterContainer");
            loadOptions(container);

            var txtHours = $(container).find("#txtHours");
            if ($.isNumeric(hourValue)) {
                txtHours.val(hourValue);
            }
            else {
                txtHours.val(padLeft(self.settings.hour.min.toString(), getMaxLength(self.settings.hour), self.settings.numberPaddingChar));
            }
            unit = "hours";
            saveOptions(container, self.settings);
            txtHours.change();
            return this;
        };

        /**
         * set the minute value to the control.
         */
        self.setMinute = function (minuteValue) {
            var container = $(this).find(".divTimeSetterContainer");
            loadOptions(container);

            var txtMinute = $(container).find("#txtMinutes");
            if ($.isNumeric(minuteValue)) {
                txtMinute.val(minuteValue);
            }
            else {
                txtMinute.val(padLeft(self.settings.minute.min.toString(), getMaxLength(self.settings.minute), self.settings.numberPaddingChar));
            }
            unit = "minutes";
            saveOptions(container, self.settings);
            txtMinute.change();
            return this;
        };

        /**
         * set the values by calculating based on total number of minutes by caller.
         */
        self.setValuesByTotalMinutes = function (totalMinutes) {
            var container = $(this).find(".divTimeSetterContainer");
            loadOptions(container);

            var txtHour = $(container).find("#txtHours");
            var txtMinute = $(container).find("#txtMinutes");

            var hourValue = 0;
            var minuteValue = 0;

            // total minutes must be less than total minutes per day
            if (totalMinutes && totalMinutes > 0 && totalMinutes < (24 * 60)) {
                minuteValue = (totalMinutes % 60);
                hourValue = ((totalMinutes - minuteValue) / 60);
            }

            txtHour.val(padLeft(hourValue.toString(), getMaxLength(self.settings.hour), self.settings.numberPaddingChar));
            txtMinute.val(padLeft(minuteValue.toString(), getMaxLength(self.settings.minute), self.settings.numberPaddingChar));

            // trigger formattings
            unit = "minutes";
            saveOptions(container, self.settings);
            txtMinute.change(); // one event is enough to do formatting one time for all the input fields
            return this;
        };

        /**
         * set the postfix display text.
         */
        self.setPostfixText = function (textValue) {
            var container = $(this).find(".divTimeSetterContainer");
            container.find(".postfix-position").text(textValue);
            return this;
        };

        /**
         * plugin default options for the element
         */
        self.getDefaultSettings = function () {
            return {
                hour: {
                    value: 0,
                    min: 0,
                    max: 24,
                    step: 1,
                    symbol: "h"
                },
                minute: {
                    value: 0,
                    min: 0,
                    max: 60,
                    step: 15,
                    symbol: "mins"
                },
                direction: "increment", // increment or decrement
                inputHourTextbox: null, // hour textbox
                inputMinuteTextbox: null, // minutes textbox
                postfixText: "", // text to display after the input fields
                numberPaddingChar: '0' // number left padding character ex: 00052
            };
        };

        /**
         * plugin options for the element
         */
        self.settings = self.getDefaultSettings();

        var wrapper = $(this);
        if (wrapper.find(".divTimeSetterContainer").length !== 1) {
            wrapper.html(htmlTemplate);
        }

        var container = wrapper.find(".divTimeSetterContainer");
        saveOptions(container, options);

        var btnUp = container.find('#btnUp');
        var btnDown = container.find('#btnDown');

        btnUp.unbind('click').bind('click', function (event) { updateTimeValue(this, event); });
        btnDown.unbind('click').bind('click', function (event) { updateTimeValue(this, event); });

        var txtHours = container.find('#txtHours');
        var txtMinutes = container.find('#txtMinutes');

        txtHours.unbind('focusin').bind('focusin', function (event) { $(this).select(); unitChanged(this, event); });
        txtMinutes.unbind('focusin').bind('focusin', function (event) { $(this).select(); unitChanged(this, event); });

        txtHours.unbind('keydown').bind('keydown', function (event) { updateTimeValueByArrowKeys(this, event); });
        txtMinutes.unbind('keydown').bind('keydown', function (event) { updateTimeValueByArrowKeys(this, event); });

        $(container).find("input[type=text]").each(function () {
            $(this).change(function (e) {
                formatInput(e);
            });
        });

        // set default values
        if (txtHours.val().length === 0) {
            txtHours.val(padLeft(self.settings.hour.min.toString(), getMaxLength(self.settings.hour), self.settings.numberPaddingChar));
        }

        if (txtMinutes.val().length === 0) {
            txtMinutes.val(padLeft(self.settings.minute.min.toString(), getMaxLength(self.settings.minute), self.settings.numberPaddingChar));
        }

        var hourSymbolSpan = txtHours.siblings("span.hourSymbol:first");
        hourSymbolSpan.text(self.settings.hour.symbol);

        var minuteSymbolSpan = txtMinutes.siblings("span.minuteSymbol:first");
        minuteSymbolSpan.text(self.settings.minute.symbol);

        var postfixLabel = container.find(".postfix-position");
        postfixLabel.text(self.settings.postfixText);

        return this;
    };

}(jQuery));