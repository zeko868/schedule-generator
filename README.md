## Table of Contents
* [**Introduction**](#introduction)
* [**Installation**](#installation)
* [**Configuration**](#configuration)
* [**Available rules**](#available-rules)
* [**Use cases with images**](#use-cases-with-images)
* [**Comparison between app versions**](#comparison-between-app-versions)

## Introduction
This project was main programming solution in a practical part of my Master thesis [_Linking logic programming with other programming paradigms_](https://dabar.srce.hr/en/islandora/object/foi%3A3793) (document is in Croatian language). That's why the base of it is written in [Prolog](https://en.wikipedia.org/wiki/Prolog) - programming language that is the major representative of [logic programming paradigm](https://en.wikipedia.org/wiki/Logic_programming). 

The solution solves the timetabling problem from students' perspective, i.e. it helps them find the timetable that suits them the best according to subjects they enroll and constraints/preferences they set. It was originally designed for application on the [Faculty of Organization and Informatics, University of Zagreb](https://www.foi.unizg.hr/), but it's quite configurable, so it could be used for students of other universities and even for solving similar problems outside academic area. The only feature which wouldn't be available in that case is data generation which is done by web-scrapping [its web-application](https://nastava.foi.hr/) in order to retrieve various info about subjects and its classes. Of course, even tiniest changes in that web-application could also break that feature completely (if they already haven't 😐). Fortunately, the application can still be used with custom data, although data construction/preparation does take some time.

It consists of four versions where the code for each of them is available on one of the branches of this repository:
* [Solution where all results are retrieved all at once](https://github.com/zeko868/schedule-generator/tree/results-all-at-once) - after request submission user has to wait that all solutions are found and only then they are sent to user
* [Solution where the results are retrieved on request one-by-one (using AJAX)](https://github.com/zeko868/schedule-generator/tree/results-one-by-one-(using-AJAX)) - after request submission only the first solution is displayed to the user and additional request has to be sent for retrieval of each following solution
* [Solution where the results are retrieved continuously (using WebSockets)](https://github.com/zeko868/schedule-generator/tree/results-continuously-(using-WebSockets)) - after request submission the application shares an endpoint to user and by establishing connection with that endpoints, the solutions are sent to user in batches as they are being found
* [Multi-threaded solution where the results are retrieved continuously (using WebSockets and multithreaded long-running application)](https://github.com/zeko868/schedule-generator/tree/results-continuously-(using-WebSockets-and-multithreaded-long-running-application)) - essentially the same as the previous one, except it uses multithreading on the server-side for processing

## Installation
The application can either be set-up using [Docker](https://www.docker.com/) or by installing all prerequisites and application itself on your system. I highly recommend the first option.
If you want to use custom data or you actually want to run customized version of this application, you can still use any of those options!
### a. Installation using Docker 🐳 
Simplest option to get the application up and running is by downloading Docker image from DockerHub using the following command:
<pre>
docker run --network host -e GOOGLE_MAPS_API_KEY='<i>YOUR_GOOGLE_MAPS_API_KEY</i>' -itd zeko868/schedule-generator
</pre>

Don't forget to replace placeholder _YOUR_GOOGLE_MAPS_API_KEY_ with your actual key if you want access to all features like distance matrix autofill and geocoding. If you are not interested in those features, then you can omit definition of that environment variable. Other supported environment variables are listed [here](#configuration).

After that, you can access any of the app versions by visiting [http://localhost](http://localhost) in your preferred web-browser where you should see folders representing each app version.

> ℹ **_NOTE_**
<br/>Docker image can also be run without _--network host_ option, but then the version of app with WebSockets (the one without long-running application) won't work. You might then also want to provide to the previous command options for exposing ports 80 and 28960, i.e. _-p 80:80 -p 28960:28960_. Otherwise the web-application wouldn't be available on _localhost_ address, but you would rather need to access it through container's internal IP address.

If you want to build your own Docker image, then you can do that by cloning this repository and then from its root directory run this command:
```bash
docker build --tag zeko868/schedule-generator
```

After the process completes, to run the image execute aforementioned command (this time the image won't be downloaded since the newly-built one is available in local container registry).

### b. Classic installation 🔨
#### Prerequisites 🧾
Ensure that you have the following items present on your system:
* web-server of your choice (e.g. Apache or Nginx)
* PHP 7.2 or newer (with enabled multithreading if you want to use the version of app with WebSockets and multithreaded long-running app since it is using [_pthreads_](https://github.com/krakjoe/pthreads) library (set-up instructions can be found [here](https://github.com/krakjoe/pthreads/blob/master/README.md) and [here](https://gist.github.com/lokisho/8ee9e73c92fdb9bce3ea501e7d5217c7)) - in that case PHP version should not be 7.4 nor newer since that library is not supported in any of these)
* [Composer](https://getcomposer.org/) - if you want to use the versions of app with WebSockets
* [SWI-Prolog](https://www.swi-prolog.org/)
* [Node.js](https://nodejs.org/) - if you want that the app performs retrieval of class info with web-scrapping, i.e. in case that it's not included in the _data_ directory with sample data

Moreover, paths of binary directories (folders containing executables) of PHP, Composer, SWI-Prolog and NodeJS (if used) have to be added to the PATH environment variable.

You might also want to install some of the PHP modules, since without them, some features will be unavailable. In the table below are listed module names and their purposes, so you can select which of those to install according to your requirements.
<table>
    <tr>
        <th>module name</th>
        <th>when to install</th>
    </tr>
    <tr>
        <td><i>curl</i></td>
        <td rowspan="3">if you want that the app performs retrieval of info about study programmes and their courses/classes with web-scrapping</td>
    </tr>
    <tr>
        <td><i>xml</i></td>
    </tr>
    <tr>
        <td><i>xmlreader</i></td>
    </tr>
    <tr>
        <td><i>sockets</i></td>
        <td>if you want to use version(s) of this app with WebSockets</td>
    </tr>
</table>
On Ubuntu these could be obtained with the following command:

```bash
apt install libxml2 php7-curl php7-sockets php7-xml php7-xmlreader
```

#### Application deployment 🔧
Clone this repository into web-directory of your web-server and from root directory of that repository run the command below in order to obtain dependencies which are required for WebSockets versions of this app to work:
```bash
composer install
```

Finally, you should be able to access the application by visiting [http://localhost/schedule-generator](http://localhost/schedule-generator) in your preferred web-browser where you should see starting page of this app. The version of app which is used depends on the branch that is currently active. By default, that should be the version with WebSockets and multithreaded long-running application. If you want to use some other version of the app, switch to other branch with <code>git checkout "<i>BRANCH_NAME</i>"</code> command. The list of branch names can be found with `git branch`.

#### Limitations for running on Windows ⚠️
If you are on Windows and you are setting this app on [WSL](https://docs.microsoft.com/en-us/windows/wsl/) (which I highly recommend), then this does not apply for you, i.e. there are no limitations for running this app.
Otherwise, the versions of app with WebSockets won't continuously load newly-found solutions.

## Configuration
The application is on runtime looking for values of the following environment variables:

Name of the environment variable | Default value | Description
--- | :---: | ---
*GOOGLE_MAPS_API_KEY* | _empty string_ | API key for Google Maps required to enable distance matrix autofill and geocoding
*INITIAL_MAP_CENTER_GEOCOORDINATES* | 45,16 | comma-separated latitude and longitude of a location on which the map will be initially centered
*INITIAL_MAP_ZOOM_LEVEL* | 7 | a value between 0-19 representing initial zoom level of the map
*AJAX_MAX_FETCH_SIZE* | 1 | maximum number of solutions to be retrieved on request when version of app with AJAX is used
*WEBSOCKETS_RECENT_SOLUTIONS_SEND_PERIOD* | 0.2 | period in seconds specifying how often the recently retrieved results will be sent to the client when WebSockets are used
*WEBSOCKETS_LONG_RUNNING_APP_PORT* | 28960 | port number that will be used for specifying endpoint for communication using WebSockets when the version of app with web-sockets and multithreaded long-running application is used

If you want to use custom data, you can do that by modifying/overriding the files inside _data_ folder. Other option is to create _shared-data_ folder inside root directory of repository and there add new files - the effect will be the same.

When you are running app inside Docker container, then the recommended approach to add custom data would be by mounting volume with data in the container. If you already started a container, you'll first have to remove it. After that, clone this repository on your system and rerun the command for its creation again while being located in root directory of cloned repository, but this time with providing the following option to the Docker command: _--volume $(pwd):/var/www/localhost/htdocs/current_. Now create in that directory new folder named _shared-data_ and all the files you put in there will be as well recognized by all the other versions of app inside of Docker container.

In case you don't only want to use custom data in apps inside of Docker container, but also customize the application, you can do that by changing the project code you cloned - in case you rerun Docker image with repository folder mounted as a volume in it, then all changes you apply/save can be immediately tested on [http://localhost/current](http://localhost/current). If you are modifying one of the WebSockets app versions, don't forget retrieve required dependencies using [Composer](https://getcomposer.org/) with `composer install`. This custom version of app should also be listed on [app home screen](http://localhost/) with name _current_ along other app versions.

## Available rules
Below is the table of rules, which can be set as additional constraints when solving timetabling problem, and their corresponding descriptions.
Values of italicized arguments encompass a _primary key_ (along with the name of the rule they belong) what means that one rule can be provided multiple times in constraint list as long as the tuple of italicized argument values is unique. For example, rule _largest daily duration of subject classes_ can be added multiple times as long as there are no two definitions of that rule with the same value selected as subject. On the other hand, rules without any italicized argument (like _smallest amount of days without classes_) can be defined only once in the constraint list.

Rule name | Arguments | Min value of integer argument | Additional note
--- | --- | :---: | ---
largest daily duration of subject classes | <ul><li>*subject (or any)*</li><li>duration</li></ul> | N/A |
largest duration of stay around faculty | <ul><li>*day of the week (or any)*</li><li>duration</li></ul> | N/A |
smallest duration of classes | <ul><li>*day of the week (or any)*</li><li>duration</li></ul> | N/A |
largest duration of classes | <ul><li>*day of the week (or any)*</li><li>duration</li></ul> | N/A |
largest amount of time gaps | <ul><li>*day of the week (or any)*</li><li>integer</li></ul> | N/A | requires that the rule _time gap definition_ is defined as well for the selected day of the week
largest allowed duration of time gap | <ul><li>*day of the week (or any)*</li><li>duration</li></ul> | 0 |
earliest start-time of classes | <ul><li>*day of the week (or any)*</li><li>time</li></ul> | N/A |
latest end-time of classes | <ul><li>*day of the week (or any)*</li><li>time</li></ul> | N/A |
day without classes | <ul><li>*day of the week*</li></ul> | N/A |
smallest amount of days without classes | <ul><li>integer</li><li>boolean</li></ul> | 1 | boolean is for setting whether the days of weekend are counted or not
largest amount of consecutive days with a lot of classes | <ul><li>*duration*</li><li>*integer*</li></ul> | 1 |
largest amount of consecutive days that start pretty early | <ul><li>*time*</li><li>*integer*</li></ul> | 1 |
largest amount of days with a lot of classes | <ul><li>*duration*</li><li>*integer*</li></ul> | 1 |
largest amount of days that start pretty early | <ul><li>*time*</li><li>*integer*</li></ul> | 1 |
only mandatory classes | <ul><li>boolean</li></ul> | N/A | boolean is for setting whether all optional classes should be excluded or not
duration of journey between buildings | <ul><li>distance matrix</li></ul> | N/A |
time gap definition | <ul><li>*day of the week (or any)*</li><li>duration</li></ul> | N/A |
class-attendance selection | <ul><li>*subject (or any)*</li><li>*class type (or any)*</li><li>trilean</li></ul> | N/A | trilean is for setting whether the classes should be definitely included, optionally included or definitely excluded
class time slot selection | <ul><li>*subject*</li><li>*class type*</li><li>time slot</li><li>boolean</li></ul> | N/A | boolean is for setting whether the selected time slot of selected class is mandatory or should be excluded

It is also worth mentioning that when the value of one italic argument is set to '_any_', then other rules with same name are actually treated as exceptions to that generic rule. For instance, if in the constraint list there are two rules with name _latest end-time of classes_, where one is with values ('any', '18:00') and the other with values ('Friday', '15:00'), then solutions would be timetables where classes are never after 6pm, where on Friday they aren't even after 3pm.

## Use cases with images
When the app is running using available Docker image, by loading web-address [http://localhost](http://localhost) in the web-browser is shown _fancy_ directory listing where user can select which app version to be used. Otherwise, the home page of application (the version depends on the current repository branch) would be loaded where the info like app language, study programme, academic year and semester should be specified.
![introductory screens](https://github.com/zeko868/schedule-generator/blob/assets/1_intro.gif)
After these parameters are selected and submitted, the page with **all** classes on the calendar is shown, as well as the list with available and enrolled courses/subjects. By default, first one initially contains all the subjects and the latter one is empty. There are also available four buttons for transferring one or all items between the lists.
<br/>
Finally, there are several more buttons for defining constraints, sending request for result/solution retrieval, switching between weekly and daily calendar and navigating through time. So, let's start by adding several courses/subjects as enrolled:
![selection of enrolled classes](https://github.com/zeko868/schedule-generator/blob/assets/2_class_selection.gif)
Now comes the fun part - let's see (some) valid solutions, or in other words, timetables where there are no time conflicts (no classes are overlapping).
![solution retrieval and browsing - WebSockets version](https://github.com/zeko868/schedule-generator/blob/assets/3_solution_retrieval_websockets.gif)
After the results are retrieved, additional 4 buttons for navigating through the list of found solutions appear and can be used. Since many classes are held in multiple time slots, and for some classes the attendance isn't mandatory, that's the explanation why from 5 selected subjects there were found thousands of valid solutions.

But 4320 total solutions? 🤯 How could I in a reasonable time inspect all of those and find the one that suits me the best? 🤔

In order to narrow down choices according to our preferences, next we’ll define constraints. Take a look at the image below with one of the found timetables:
![sample solution with undesirables](https://github.com/zeko868/schedule-generator/blob/assets/4_sample_solution_and_issues.png)
In the image are listed numbers denoting issues/undesirables for whose resolution the corresponding rules will be applied:
1. On Tuesdays there is too much free time between two classes. Yes, it’s great to have breaks between classes to eat something in the canteen and to chit-chat with colleagues in nearby café, but 7 and half hours is IMHO too much time to wait, especially if the next class is lab exercise requiring a lot of attention like in this case 🥱 Therefore, let’s set the rule that’ll hide all timetables containing waiting periods longer than 4 hours, inclusively.
2. Waking up several times per week early in the morning in order to arrive at university at 8 o’clock? For the rest of life we’ll have to be present early at workplace (OK, not if we’ll have flexible working hours 😅), so why not to enjoy a longer sleep while still can during student days 😀 We’ll set the rule to avoid that we have classes several days in a row before 8:30am.
3. Since the attendance for the only class on Friday isn’t mandatory and it would be great to have three-day weekend, let’s specify rule for ensuring that no classes will be on Fridays 🥳
Furthermore, it also seems feasible to have valid timetable with even 2 days without any formal student obligations, but no need to necessarily insist on Wednesday, so we’ll define a rule for making sure that at least 2 workdays are without classes 🎉

Enough talk! Let's see that in action:
![definition of some rules](https://github.com/zeko868/schedule-generator/blob/assets/5_rules_definition.gif)
Pretty cool, isn't it? Now is a choice a bit easier to make! 😎

For the purpose of displaying a few more available rules, shall we define several more constraints and assumptions? 😊
In the following image are selected two classes which actually isn’t possible to attend (at least not timely) since they are held on two different geographical locations (i.e. not inside of same building).
![so far unhandled collision issue](https://github.com/zeko868/schedule-generator/blob/assets/6_sample_solution_with_unregistered_collision.png)
Normally, that wouldn't be a problem if the travelling duration between two locations is less than 15min assuming that the academic quarter applies for the next class, but for the class from this example is that not the case, so it wouldn’t be doable to get on it on time 🕒 That’s why we’ll define distances between all the buildings to omit inconvenient combinations like this one.
![distance matrix definition](https://github.com/zeko868/schedule-generator/blob/assets/7_distance_table_definition.gif)
Additionally, let’s suppose that on subject Strategic Planning of Information Systems we were assigned to seminar classes on Thursdays between 2pm-4pm and are therefore unable to attend them in any other time slot, so we don’t want timetables consisting those❗ Also, personally I find lab exercises as a very useful class type due to application of theory to practice, thus we’ll set the rule to always include classes of that type for all enrolled subjects which have them 👩‍🔬👨‍🔬 Finally, assume that we are specially interested in the area of information security, so we would like to attend all class types of subject Internet Security even though attendance on them isn't mandatory, hence let's introduce such rule as well. 👩‍💻👨‍💻
![oefinition of some additional rules](https://github.com/zeko868/schedule-generator/blob/assets/8_additional_rules_definition.gif)

## Comparison between app versions
All versions of app have same features - the difference is primarily in the manner how results are retrieved from the server and how the user navigates through that result set.

### [Solution where all results are retrieved all at once](https://github.com/zeko868/schedule-generator/tree/results-all-at-once)
After request submission user has to wait that all solutions are found and only then they are sent back to user (to be exact, user agent or web-browser). The downside here is that user might have to wait way too long for solutions if there is no interest in browsing through all of them, but rather only first one or a couple of them. A drawback would also be a blank screen which is visible between the moment when the server sent response to the web-browser and the moment when web-browser completes parsing received HTML document.
![solution retrieval and browsing - all at once version](https://github.com/zeko868/schedule-generator/blob/assets/3_solution_retrieval_basic.gif)
### [Solution where the results are retrieved on request one-by-one (using AJAX)](https://github.com/zeko868/schedule-generator/tree/results-one-by-one-(using-AJAX))
After request submission only the first solution is displayed to the user and additional request has to be sent for retrieval of each following solution.
![solution retrieval and browsing - AJAX one by one version](https://github.com/zeko868/schedule-generator/blob/assets/3_solution_retrieval_ajax.gif)
Obviously, the app becomes quite frustrating to use when there is a lot of solutions and user wants to browse through a lot of them. Luckily, this behaviour can be easily slightly changed - in other words, as mentioned in [**Configuration**](#configuration) chapter, there is also available environment variable *AJAX_MAX_FETCH_SIZE* which can be used to specify amount of solutions (or less of them if there are none of them left) that will be retrieved on request. For example, following image shows how the solutions are retrieved when the value of that environment variable is set to 50:
![solution retrieval and browsing - AJAX with batches](https://github.com/zeko868/schedule-generator/blob/assets/3_solution_retrieval_ajax_with_batches.gif)
This way the time user spends on waiting for the solution to be loaded is significantly reduced. This app version is as well least performance-demanding, both for the server-side and the client-side, since the server-side stops further search when request amount of solutions is found, and on the other hand, user's web-browser doesn't need to handle huge amount of data (or at least on at once what's the case with the aforementioned app version). In case it is expected that there is no need to calculate all the solutions since the user will most likely see only tiny portion of them, this would be the suggested app version.
### [Solution where the results are retrieved continuously (using WebSockets)](https://github.com/zeko868/schedule-generator/tree/results-continuously-(using-WebSockets))
You've probably already seen how that looks like with the WebSockets version (if you haven't skipped the previous chapter), but in case you haven't or you find it easier to compare when images of all app versions are all at one place, I'm attaching again how does it look like from user's perspective when the request retrieval of all valid solutions is sent and user wants to navigate through them.
![solution retrieval and browsing - WebSockets version](https://github.com/zeko868/schedule-generator/blob/assets/3_solution_retrieval_websockets.gif)
After request submission the application shares an endpoint to user and by establishing connection with that endpoints, the solutions are sent to user in batches as they are being found. This makes this app version very responsive, since the page is almost immediately reloaded after form submission, and user gets solutions for selected query as soon as some of them are found. Frequency at which the newly-found solutions are sent to the user can be configured by setting *WEBSOCKETS_RECENT_SOLUTIONS_SEND_PERIOD* environment variable, as already stated in [**Configuration**](#configuration) chapter.
### [Multi-threaded solution where the results are retrieved continuously (using WebSockets and multithreaded long-running application)](https://github.com/zeko868/schedule-generator/tree/results-continuously-(using-WebSockets-and-multithreaded-long-running-application))
In this version of app is almost everything the same as in the previous one, at least on the client's side. The only difference there is that in the previous version the page is actually submitted and reloaded when user sends request for solution retrieval, which is no longer the case - strictly speaking, this version of app sends the usual request data using WebSockets technology since the exact endpoint is known in advance. On the other hand, in order that the server-side app for communication using WebSockets can always listen on the same/fixed port (by default 28960, but this value can be overridden by assigning arbitrary value to _WEBSOCKETS_LONG_RUNNING_APP_PORT_ environment variable), and in the same time can handle multiple users simultaneously, logic for searching solution had to be transferred in the separate application that will serve all the users, and not only the specific one who initiated the request. Therefore, this long-running application is run the first time when someone accesses the web-application and after that it remains active for handling requests of that users, but also of all the other users that will further use it as well. Furthermore, this application is developed with multithreading (hence requiring PHP with _pthreads_ library) in order to provide seamless job execution (particularly result-processing and notifying users with recently-found solutions) when it is used at the same time by more users.
![solution retrieval and browsing - version using WebSockets with multithreaded long-running application](https://github.com/zeko868/schedule-generator/blob/assets/3_solution_retrieval_websockets_v2.gif)
