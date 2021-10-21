var timesetterOptions = {
    hour: {
        value: 0,
        min: 0,
        max: 24,
        step: 1,
        symbol: "hrs"
    },
    minute: {
        value: 0,
        min: 0,
        max: 60,
        step: 1,
        symbol: "mins"
    },
    direction: "increment", // increment or decrement
    inputHourTextbox: null, // hour textbox
    inputMinuteTextbox: null, // minutes textbox
    postfixText: "", // text to display after the input fields
    numberPaddingChar: "0" // number left padding character ex: 00052
};

var map;
var geocoder;
var markersArray = new Array(zgrade.length).fill(null);
var bounds;

var elementSUkupnimBrojem = $("#ukupno-kombinacija");

if (josKombinacija) {
    var brojKombinacijaRasporeda = parseInt(elementSUkupnimBrojem.html());
    $("#possible-incompleteness-note").html(tekst['soFar']);
    if (brojKombinacijaRasporeda > 1) {
        omoguciTipku($("#posljedni"));
    }
}
else {
    var brojKombinacijaRasporeda = parseInt(elementSUkupnimBrojem.html());
    naznaciDosegnutKraj();
    if (brojKombinacijaRasporeda === 1) {
        onemoguciTipku($("#sljedeci"));
    }
    else {
        omoguciTipku($("#posljedni"));
    }
}

function initializeDistCalc() {
    var [lat, lng] = initialMapCenterGeocoordinates.split(",");
    var opts = {
        center: new google.maps.LatLng(lat, lng),
        zoom: initialMapZoomLevel,
        maxZoom: 18
    };
    map = new google.maps.Map(document.getElementById('map-canvas'), opts);
    geocoder = new google.maps.Geocoder();

    var sadrzajTabliceAdresa = $("#forma-pozicija-zgrada > table > tbody");
    bounds = new google.maps.LatLngBounds();
    for (var i=0; i < zgrade.length; i++) {
        var zgrada = zgrade[i];
        var redakTablice = $('<tr></tr>');
        sadrzajTabliceAdresa.append(redakTablice);
        redakTablice.append(`<td>${zgrada}</td>`);
        var adresaZgrade, geokoordinateZgrade, defaultniStatus;
        if (lokacijeZgrada.hasOwnProperty(zgrada) && lokacijeZgrada[zgrada].geocoordinates !== '') {
            var lokacijaZgrade = lokacijeZgrada[zgrada];
            adresaZgrade = lokacijaZgrade.address;
            geokoordinateZgrade = lokacijaZgrade.geocoordinates;
            var lokacija = convertLatLngStringToObject(geokoordinateZgrade);
            bounds.extend(lokacija);
            addMarker(i, zgrada, lokacija);
            defaultniStatus = 'valid';
        }
        else {
            adresaZgrade = zgrada;
            geokoordinateZgrade = '';
            setTimeout(function(index, locationAddress) {
                geocodeLocationAddress(index, locationAddress, null);
            }.bind(undefined, i, adresaZgrade), 100);
            defaultniStatus = 'warning';
        }
        var kontrolaZaUnosAdrese = $(`<input type="text" class="address" value="${adresaZgrade}" data-geocode-status="${defaultniStatus}"/>`);
        redakTablice.append(kontrolaZaUnosAdrese);
        kontrolaZaUnosAdrese.wrap('<td></td>');
        redakTablice.append(`<td><input type="hidden" class="geocoordinates" value="${geokoordinateZgrade}"/></td>`);
        kontrolaZaUnosAdrese.focusin(function() {
            $(this).attr('data-geocode-status', 'pending');
        });
        kontrolaZaUnosAdrese.focusout(function() {
            var index = $(this.parentNode.parentNode).index();
            setTimeout(function(kontrola) { // little delay required because the value of clicked option from the dropdown isn't immediately populated in the input control
                var enteredAddress = kontrola.val();
                geocodeLocationAddress(index, enteredAddress, 'error');
            }.bind(undefined, $(this)), 100);
        });
        kontrolaZaUnosAdrese.keypress(function(event) {
            if (event.keyCode == 13) {
                $(this).trigger( "focusout" );
            }
            return true;
        });
    }

    $("#forma-pozicija-zgrada > table > tbody input.address").each(function() {
        new google.maps.places.Autocomplete(this);
    });
}

function geocodeLocationAddress(index, locationAddress, statusCodeForFailure) {
    var coordinatesInputField = $(`#forma-pozicija-zgrada > table > tbody > tr:nth-child(${index+1}) input.geocoordinates`);
    var addressInputField = $(`#forma-pozicija-zgrada > table > tbody > tr:nth-child(${index+1}) input.address`);
    var previousMarker = markersArray[index];
    if (previousMarker != null) {
        previousMarker.setMap(null);
    }
    if (locationAddress === '') {
        coordinatesInputField.val('');
        if (statusCodeForFailure !== null) {
            addressInputField.attr('data-geocode-status', statusCodeForFailure);
        }
    }
    else {
        geocoder.geocode({
            'address': locationAddress
        }, function(results, status) {
            if (geoMappingDialog.dialog('isOpen')) {
                if (status == google.maps.GeocoderStatus.OK) {
                    addressInputField.attr('data-geocode-status', 'valid');
                    var locationName = $(`#forma-pozicija-zgrada > table > tbody > tr:nth-child(${index+1}) td:first-child`).html();
                    var location = results[0].geometry.location;
                    var locationCoordinates =  `${location.lat()},${location.lng()}`;
                    coordinatesInputField.val(locationCoordinates);
                    var bounds = new google.maps.LatLngBounds();
                    $(`#forma-pozicija-zgrada > table > tbody input.geocoordinates`).each(function() {
                        var eachLocationCoordinates = $(this).val();
                        if (eachLocationCoordinates !== '') {
                            var eachLocation = convertLatLngStringToObject(eachLocationCoordinates);
                            bounds.extend(eachLocation);
                        }
                    });
                    map.fitBounds(bounds);
                    addMarker(index, locationName, location);
                }
                else {
                    coordinatesInputField.val('');
                    if (status == google.maps.GeocoderStatus.ZERO_RESULTS) {
                        if (statusCodeForFailure !== null) {
                            addressInputField.attr('data-geocode-status', statusCodeForFailure);
                        }
                    }
                    else {
                        alert('Geocode was not successful for the following reason: ' + status);
                    }
                }
            }
        });
    }
}

function addMarker(index, locationName, location) {
    var marker = new google.maps.Marker({
        map: map,
        position: location,
        title: locationName
    });
    markersArray[index] = marker;
}

function popuniMatricuUdaljenosti() {
    pokusajPopunitiMatricuUdaljenosti(1);
}

function pokusajPopunitiMatricuUdaljenosti(attemptNum) {
    if (!geoMappingDialog.dialog('isOpen')) {   // in case that the button was clicked multiple times in short period of time
        return;
    }
    if (attemptNum > 5) {
        alert(`${tekst['pendingGeocodingTimeoutReached']}`);
        return;
    }
    var inputAddressStatuses = $("#forma-pozicija-zgrada > table > tbody input.address").map(function() {return $(this).attr("data-geocode-status")}).toArray();
    if (!inputAddressStatuses.every(function(status) {return status === 'valid' || status === 'pending'})) {
        alert(`${tekst['locationAddressesUnresolvable']}`);
        return;
    }
    if (inputAddressStatuses.every(function(status) {return status === 'valid'})) {
        var service = new google.maps.DistanceMatrixService();
        var travelMode = $("#travel-mode").val();
        var locations = $("#forma-pozicija-zgrada table tbody input.geocoordinates").map(function(){return new convertLatLngStringToObject($(this).val())}).toArray();

        service.getDistanceMatrix({
            origins: locations,
            destinations: locations,

            travelMode: travelMode,
            unitSystem: google.maps.UnitSystem.METRIC,
            avoidHighways: false,
            avoidTolls: false
        }, function(response, status) {
            if (status != google.maps.DistanceMatrixStatus.OK) {
                alert('Error was: ' + status);
            }
            else {
                for (var row of response.rows) {
                    for (var element of row.elements) {
                        if (element.status === google.maps.DistanceMatrixElementStatus.ZERO_RESULTS) {

                            alert(`${tekst['noRouteFoundForSelectedTravelMode']}`);
                            return;
                        }
                    }
                }
                var prviRedak = true;
                var redoviMatrice = $("#distance-matrix-table > tbody > tr");
                $("#is-distance-matrix-symmetric").prop("checked", false);
                redoviMatrice.each(function(indexRetka, redak) {
                    redak = $(redak);
                    if (prviRedak) {
                        prviRedak = false;
                        return;
                    }
                    var results = response.rows[indexRetka-1].elements;
                    redak.children().each(function(indexStupca, celija) {
                        if (indexStupca === 0) {
                            return true;
                        }
                        var trajanjePutovanja = results[indexStupca-1].duration.value;
                        var ukupnoMinuta = Math.ceil(trajanjePutovanja / 60);
                        var sati = Math.trunc(ukupnoMinuta / 60);
                        var minute = ukupnoMinuta % 60;
                        $('div.trajanje', $(celija)).timesetter(timesetterOptions).setHour(sati).setMinute(minute);
                    });
                });
            }
            geoMappingDialog.dialog( "close" );
        });
    }
    else {
        setTimeout(function() {pokusajPopunitiMatricuUdaljenosti(attemptNum+1)}, 1000);
    }
}

function convertLatLngStringToObject(latLngString) {
    var coordinates = latLngString.split(',');
    var lat = coordinates[0];
    var lng = coordinates[1];
    return new google.maps.LatLng(lat, lng);
}

function ponistiGeografskePodatke() {
    $("#forma-pozicija-zgrada > table > tbody > tr").each(function(index){
        var locationName = $("td:first-child", $(this)).html();
        var addressField = $("input.address", $(this));
        var geocoordinatesField = $("input.geocoordinates", $(this));
        addressField.val(addressField.attr("data-old"));
        addressField.attr("data-geocode-status", addressField.attr("data-geocode-status-old"));
        geocoordinatesField.val(geocoordinatesField.attr("data-old"));
        if (markersArray[index] !== null) {
            markersArray[index].setMap(null);
        }
        var geocoordinates = geocoordinatesField.val();
        if (geocoordinates !== '') {
            var location = convertLatLngStringToObject(geocoordinates);
            var marker = new google.maps.Marker({
                map: map,
                position: location,
                title: locationName
            });
            markersArray[index] = marker;
        }
        else {
            markersArray[index] = null;
        }
    });
    geoMappingDialog.dialog( "close" );
}

$("#dodaj").click(function() {
    $("#dostupni option:selected").each(function() {
        $("#upisani").append($(this));
    });
});

$("#dodaj-sve").click(function() {
    $("#dostupni option").each(function() {
        $("#upisani").append($(this));
    });
});

$("#makni").click(function() {
    $("#upisani option:selected").each(function() {
        $("#dostupni").append($(this));
    });
});

$("#makni-sve").click(function() {
    $("#upisani option").each(function() {
        $("#dostupni").append($(this));
    });
});

$("#odabir-predmeta").submit(function() {
    $("#upisani option").prop("selected", true);
    $("#dostupni option").prop("selected", true);
    $("#ogranicenja").empty();
    $("#serijalizirani-termini-po-vrstama-po-predmetima").val(JSON.stringify(serijaliziraniTerminiPoVrstamaPoPredmetima));
    $("#zgrade").val(JSON.stringify(zgrade));
    var lokacijeZgrada = {};
    $("#forma-pozicija-zgrada > table > tbody > tr").each(function() {
        var zgrada = $("td:first-child", $(this)).html();
        var address = $("input.address", $(this)).val();
        var geocoordinates = $("input.geocoordinates", $(this)).val();
        var location = {
            address: address,
            geocoordinates: geocoordinates
        };
        lokacijeZgrada[zgrada] = location;
    });
    $("#lokacije-zgrada").val(JSON.stringify(lokacijeZgrada));
    $("#forma-ogranicenja > div").each(function(){
        var glavniSelectbox = $(":first-child > select", $(this)).first();
        var nazivPredikata = glavniSelectbox.val();
        if (nazivPredikata === "") {
            return true;    // ponaša se kao continue
        }
        if (nazivPredikata === 'trajanjePutovanjaIzmedjuZgrada') {
            var prviRedak = true;
            var redoviMatrice = $("#distance-matrix-table > tbody > tr");
            redoviMatrice.each(function(indexRetka, redak) {
                redak = $(redak);
                if (prviRedak) {
                    prviRedak = false;
                    return;
                }
                redak.children().each(function(indexStupca, celija) {
                    if (indexStupca === 0) {
                        return true;
                    }
                    var trajanje = `trajanje(${$("input.timePart.hours", $(celija)).val()},${$("input.timePart.minutes", $(celija)).val()})`;
                    var izvorisnaZgrada = JSON.stringify(zgrade[indexRetka-1]).replace("'", "''").replace(/^"|"$/g, '');
                    var odredisnaZgrada = JSON.stringify(zgrade[indexStupca-1]).replace("'", "''").replace(/^"|"$/g, '');
                    $("#ogranicenja").append(`<option value="${nazivPredikata}('${izvorisnaZgrada}','${odredisnaZgrada}',${trajanje})"></option>`);
                });
            });
        }
        else {
            var parametri = [];
            $("span > label > *", $(this)).each(function(){
                if ($(this).hasClass("trajanje")) {
                    parametri.push(`trajanje(${$("input.timePart.hours", $(this)).val()},${$("input.timePart.minutes", $(this)).val()})`);
                }
                else {
                    var vrijednost = $(this).val().toString().replace("'", "\'");
                    switch ($(this).prop("type")) {
                        case "checkbox":
                            parametri.push(`'${!$(this).prop("checked")}'`);
                            break;
                        case "radio":
                            if ($(this).is(":checked")) {
                                parametri.push(`'${vrijednost}'`);
                            }
                            break;
                        case "time":
                            var vremenskeKomponente = vrijednost.split(":");
                            parametri.push(`vrijeme(${vremenskeKomponente[0]},${vremenskeKomponente[1]})`);
                            break;
                        case "number":
                            parametri.push(vrijednost);
                            break;
                        default:
                            if ($(this).hasClass("termini")) {
                                parametri.push(vrijednost);
                            }
                            else {
                                parametri.push(`'${vrijednost}'`);
                            }
                    }
                }
            });
            $("#ogranicenja").append(`<option value="${nazivPredikata}(${parametri.join(",")})"></option>`);
        }
    });
    $("#ogranicenja option").each(function(){
        $(this).prop("selected", true);
    });

    $("#serijalizirana-forma-ogranicenja").val($("#forma-ogranicenja").html());
});

$("#prvi").click(function() {
    $("#trenutna-kombinacija").html(1);
    ucitajRaspored(1);
    onemoguciTipku($(this));
    onemoguciTipku($("#prethodni"));
    omoguciTipku($("#sljedeci"));
    omoguciTipku($("#posljedni"));
});

$("#prethodni").click(function() {
    var elementSBrojem = $("#trenutna-kombinacija");
    var brojKombinacije = parseInt(elementSBrojem.html())-1;
    if (brojKombinacije >= 1) {
        elementSBrojem.html(brojKombinacije);
        ucitajRaspored(brojKombinacije);
    }
    if (brojKombinacije === 1) {
        onemoguciTipku($("#prvi"));
        onemoguciTipku($(this));
    }
    omoguciTipku($("#sljedeci"));
    omoguciTipku($("#posljedni"));
});

$("#sljedeci").click(function() {
    var tipkaSljedeci = $(this);
    var elementSTrenutnimBrojem = $("#trenutna-kombinacija");
    var brojKombinacije = parseInt(elementSTrenutnimBrojem.html())+1;
    var brojKombinacijaRasporeda = parseInt(elementSUkupnimBrojem.html());
    if (brojKombinacije <= brojKombinacijaRasporeda) {
        elementSTrenutnimBrojem.html(brojKombinacije);
        ucitajRaspored(brojKombinacije);
        omoguciTipku($("#prvi"));
        omoguciTipku($("#prethodni"));
        if (brojKombinacije === brojKombinacijaRasporeda) {
            onemoguciTipku($("#posljedni"));
            if (!josKombinacija) {
                onemoguciTipku($("#sljedeci"));
            }
        }
    }
    else if (josKombinacija) {
        var stavkeRasporeda = [];
        var idZadnjaStavkaRasporeda = null;
        kodoviRasporeda[ kodoviRasporeda.length-1 ].forEach(function(stavkaRasporeda) {
            if (stavkaRasporeda.itemid !== idZadnjaStavkaRasporeda) {
                predmet = stavkaRasporeda.subjectid;
                lokacija = stavkaRasporeda.title.split("\n")[1];
                vrstaNastave = vrsteNastavePoBojama[stavkaRasporeda.color];
                vrijemePocetka = new Date(stavkaRasporeda.start);
                vrijemeZavrsetka = new Date(stavkaRasporeda.end);
                vrijemePocetkaSati = vrijemePocetka.getHours();
                vrijemePocetkaMinute = vrijemePocetka.getMinutes();
                vrijemeZavrsetkaSati = vrijemeZavrsetka.getHours();
                vrijemeZavrsetkaMinute = vrijemeZavrsetka.getMinutes();
                dan = naziviDana[(vrijemePocetka.getDay() || 7) - 1];
                [zgrada, dvorana] = lokacija.split(' > ');
                stavkeRasporeda.push(`'${predmet}', '${vrstaNastave}', termin('${dan}', vrijeme(${vrijemePocetkaSati}, ${vrijemePocetkaMinute}),vrijeme(${vrijemeZavrsetkaSati}, ${vrijemeZavrsetkaMinute})), lokacija('${zgrada}', '${dvorana}')`);
                idZadnjaStavkaRasporeda = stavkaRasporeda.itemid;
            }
        });
        var dataToSend = {
            prosli_raspored: stavkeRasporeda,
            upisano: $("#upisani > option").toArray().map(function(elem) {return elem.value}),
            ogranicenja: $("#ogranicenja > option").toArray().map(function(elem) {return elem.value})
        };
        $("#possible-incompleteness-note").html(tekst["workingOnIt"]);
        $.ajax({
            url : location.href,
            type: "POST",
            data : dataToSend,
            dataType: "json",
            success: function(data) {
                if (data.length) {
                    for (var raspored of data) {
                        kodoviRasporeda.push(raspored);
                        brojKombinacijaRasporeda++;
                    }
                    elementSTrenutnimBrojem.html(brojKombinacije);
                    elementSUkupnimBrojem.html(brojKombinacijaRasporeda);
                    ucitajRaspored(brojKombinacije);
                    omoguciTipku($("#prvi"));
                    omoguciTipku($("#prethodni"));
                    if (data.length === batchSize) {
                        $("#possible-incompleteness-note").html(tekst["soFar"]);
                    }
                    else {
                        if (data.length === 1) {
                            onemoguciTipku(tipkaSljedeci);
                        }
                        naznaciDosegnutKraj();
                    }
                    if (data.length > 1) {
                        omoguciTipku($("#posljedni"));
                    }
                }
                else {
                    onemoguciTipku(tipkaSljedeci);
                    onemoguciTipku($("#posljedni"));
                    naznaciDosegnutKraj();
                }
            },
            error: function() {
                $("#possible-incompleteness-note").html("");
                alert(tekst["ajaxRequestFailedError"]);
            }
        });
    }
});

$("#posljedni").click(function() {
    var brojKombinacijaRasporeda = parseInt($("#ukupno-kombinacija").html());
    $("#trenutna-kombinacija").html(brojKombinacijaRasporeda);
    ucitajRaspored(brojKombinacijaRasporeda);
    onemoguciTipku($(this));
    if (!josKombinacija) {
        onemoguciTipku($("#sljedeci"));
    }
    if (brojKombinacijaRasporeda > 1) {
        omoguciTipku($("#prvi"));
        omoguciTipku($("#prethodni"));
    }
});

function onemoguciTipku(tipka) {
    tipka.addClass("ui-state-disabled");
    tipka.attr("disabled", true);
}

function omoguciTipku(tipka) {
    tipka.removeClass("ui-state-disabled");
    tipka.attr("disabled", false);
}

function ucitajRaspored(pozicija) {
    $("#calendar").fullCalendar("removeEvents");
    $("#calendar").fullCalendar("addEventSource", kodoviRasporeda[pozicija-1]);
    $("#calendar").fullCalendar("refetchEvents");
}

function naznaciDosegnutKraj() {
    josKombinacija = false;
    $("#possible-incompleteness-note").html(tekst["endReached"]);
    setInterval(function() {
        $("#possible-incompleteness-note").hide();
    }, 5000);
}

function dodajOgranicenje() {
    var dodaniElement;
    $("#forma-ogranicenja").append(
        dodaniElement = $(`
        <div>
            <label>${tekst['rule']}
                <select>
                    <option class="trajanje predmeti svi"               data-PK-components-num="2"                      value="maxSatiPredmeta"                         >${tekst['largestDailyDurationOfSubjectClasses']}</option>
                    <option class="svi dani trajanje"                   data-PK-components-num="2"                      value="maxTrajanjeBoravkaNaFaksu"               >${tekst['largestDurationOfStayAroundFaculty']}</option>
                    <option class="svi dani trajanje"                   data-PK-components-num="2"                      value="minTrajanjeNastave"                      >${tekst['smallestDurationOfClasses']}</option>
                    <option class="svi dani trajanje"                   data-PK-components-num="2"                      value="maxTrajanjeNastave"                      >${tekst['largestDurationOfClasses']}</option>
                    <option class="svi dani kolicina"                   data-PK-components-num="2"  data-min-value="0"  value="maxBrojRupa"                             >${tekst['largestAmountOfTimeGaps']}</option>
                    <option class="svi dani trajanje"                   data-PK-components-num="2"                      value="maxTrajanjeRupe"                         >${tekst['largestAllowedDurationOfTimeGap']}</option>
                    <option class="svi dani vrijeme"                    data-PK-components-num="2"                      value="najranijiPocetak"                        >${tekst['earliestStartTimeOfClasses']}</option>
                    <option class="svi dani vrijeme"                    data-PK-components-num="2"                      value="najkasnijiZavrsetak"                     >${tekst['latestEndTimeOfClasses']}</option>
                    <option class="dani"                                data-PK-components-num="2"                      value="bezNastaveNaDan"                         >${tekst['dayWithoutClasses']}</option>
                    <option class="kolicina vikendi"                    data-PK-components-num="1"  data-min-value="1"  value="minBrojDanaBezNastave"                   >${tekst['smallestAmountOfDaysWithoutClasses']}</option>
                    <option class="kolicina trajanje"                   data-PK-components-num="3"  data-min-value="1"  value="maxBrojUzastopnihDanaDugoTrajanjeNastave">${tekst['largestAmountOfConsecutiveDaysWithLotOfClasses']}</option>
                    <option class="kolicina vrijeme"                    data-PK-components-num="3"  data-min-value="1"  value="maxBrojUzastopnihDanaRaniPocetak"        >${tekst['largestAmountOfConsecutiveDaysThatStartPrettyEarly']}</option>
                    <option class="kolicina trajanje"                   data-PK-components-num="3"  data-min-value="1"  value="maxBrojDanaDugoTrajanjeNastave"          >${tekst['largestAmountOfDaysWithLotOfClasses']}</option>
                    <option class="kolicina vrijeme"                    data-PK-components-num="3"  data-min-value="1"  value="maxBrojDanaRaniPocetak"                  >${tekst['largestAmountOfDaysThatStartPrettyEarly']}</option>
                    <option class="nacin-pretrage"                      data-PK-components-num="1"                      value="dohvatiRaspored"                         >${tekst['onlyMandatoryClasses']}</option>
                    <option class="relacije"                            data-PK-components-num="1"                      value="trajanjePutovanjaIzmedjuZgrada"          >${tekst['durationOfJourneyBetweenBuildings']}</option>
                    <option class="svi dani trajanje"                   data-PK-components-num="2"                      value="definicijaRupe"                          >${tekst['timeGapDefinition']}</option>
                    <option class="svi predmeti vrste 3-pohadjanje"     data-PK-components-num="3"                      value="pohadjanjeNastave"                       >${tekst['classAttendanceSelection']}</option>
                    <option class="predmeti vrste termini 2-pohadjanje" data-PK-components-num="3"                      value="pohadjanjeTermina"                       >${tekst['classTimeSlotSelection']}</option>
                </select>
            </label>
            <span></span>
            <input type="image" src="images/delete-icon.png" class="brisi-ogranicenje"/>
        </div>
        `)
    );
    dodajRedakOgranicenja($(":first-child > select", dodaniElement).first());
    zaskrolajNaDnoListe();
}

function zaskrolajNaDnoListe() {
    var plocaOgranicenja = document.getElementById("constraints-dialog-form");
    plocaOgranicenja.scrollTop = plocaOgranicenja.scrollHeight;
}

function privremenoOsvijetliKontrolu(kontrola) {
    kontrola.addClass( "ui-state-highlight" );
    setTimeout(function() {
        kontrola.removeClass( "ui-state-highlight", 1500 );
    }, 500 );
}

function dodajRedakOgranicenja(glavniSelectbox) {
    var vrijednostiOgranicenja = glavniSelectbox.parent().next();
    vrijednostiOgranicenja.empty();
    var oznacenaOpcija = $("option:selected", glavniSelectbox);
    if (oznacenaOpcija.attr("data-PK-components-num") === "1") {
        var svaIstoimenaPravila = $(`#forma-ogranicenja > div > label > select > option:selected[value="${oznacenaOpcija.val()}"]`).parent();
        if (svaIstoimenaPravila.length > 1) {
            svaIstoimenaPravila.each(function(){
                privremenoOsvijetliKontrolu($(this));
            });
        }
    }
    if (oznacenaOpcija.hasClass("relacije")) {
        vrijednostiOgranicenja.css('display', 'inline-flex');
        vrijednostiOgranicenja.append(`<label>${tekst['distances']}</label>`);
        var matricaUdaljenosti = $('<table id="distance-matrix-table" class="relacije"></table>');
        var sadrzajTablice = $('<tbody></tbody>');
        zaglavljeRedak = $('<tr><th/></tr>');
        for (var zgrada of zgrade) {
            zaglavljeRedak.append(`<th>${zgrada}</th>`);
        }
        sadrzajTablice.append(zaglavljeRedak);
        for (var zgrada of zgrade) {
            redakSUdaljenostima = $(`<tr><th>${zgrada}</th></tr>`);
            for (var zgrada2 of zgrade) {
                var kontrolaZaUnosUdaljenosti = $('<div class="trajanje"/>');
                if (zgrada === zgrada2) {
                    kontrolaZaUnosUdaljenosti.addClass('disabled');
                }
                redakSUdaljenostima.append(kontrolaZaUnosUdaljenosti);
                kontrolaZaUnosUdaljenosti.wrap('<td></td>');
                kontrolaZaUnosUdaljenosti.wrap('<label style="display: inline-flex; display: -webkit-inline-flex;"></label>');
            }
            sadrzajTablice.append(redakSUdaljenostima);
        }
        matricaUdaljenosti.append(sadrzajTablice);
        matricaUdaljenosti.append($(`<tfoot><tr><td></td><td colspan="${sadrzajTablice.children().length-1}"><button type="button" class="ui-button ui-corner-all ui-widget" onclick="showBuildingLocationDefinitionWindow()">${tekst['autofillDistanceMatrix']}</button></td></tr></tfoot>`));
        vrijednostiOgranicenja.append(matricaUdaljenosti);
        matricaUdaljenosti.wrap($(`<label style="margin: 0"></label>`));
        vrijednostiOgranicenja.append($(`<label for="is-distance-matrix-symmetric">${tekst['isDistanceMatrixSymmetric']}: </label><input type="checkbox" id="is-distance-matrix-symmetric" onchange="toggleDistanceMatrixSymmetricity(this)"/>`));

        setTimeout(function() {
            uciniKontroleNaDijagonaliNepromjenjivima();
        }, 200);
    }
    if (oznacenaOpcija.hasClass("predmeti")) {
        var labela = $(`<label>${tekst['course']}</label>`);
        var predmeti = $('<select class="predmeti"></select>');
        if (oznacenaOpcija.hasClass("svi")) {
            predmeti.append(`<option value="">${tekst['anyCourse']}</option>`);
        }
        predmeti.append($("#upisani > option").clone());
        labela.append(predmeti);
        vrijednostiOgranicenja.append(labela);
    }
    if (oznacenaOpcija.hasClass("vrste")) {
        var labela = $(`<label>${tekst['classType']}</label>`);
        var vrste = $('<select class="vrste"></select>');
        if (oznacenaOpcija.hasClass("svi")) {
            vrste.append(`<option value="any">${tekst['anyClassType']}</option>`);
            Object.keys(serijaliziraniTerminiPoVrstamaPoPredmetima['']).forEach(function(vrsta) {
                vrste.append(`<option value="${vrsta}">${naziviVrsta[vrsta]}</option>`);
            });
        }
        else {
            Object.keys(serijaliziraniTerminiPoVrstamaPoPredmetima[$("#upisani > option").first().val()]).forEach(function(vrsta) {
                vrste.append(`<option value="${vrsta}">${naziviVrsta[vrsta]}</option>`);
            });
        }
        labela.append(vrste);
        vrijednostiOgranicenja.append(labela);
    }
    if (oznacenaOpcija.hasClass("termini")) {
        var labela = $(`<label>${tekst['timeslot']}</label>`);
        var kontrolaSTerminima = $('<select class="termini"></select>');
        var kontrolePravila = glavniSelectbox.parent().next();
        var terminiNastave = serijaliziraniTerminiPoVrstamaPoPredmetima[$("select.predmeti", kontrolePravila).val()][$("select.vrste", kontrolePravila).val()];
        Object.keys(terminiNastave).forEach(function(val) {
            var vrijednostTermina = Object.keys(terminiNastave[val])[0];
            kontrolaSTerminima.append(`<option value="${vrijednostTermina}">${terminiNastave[val][vrijednostTermina]}</option>`);
        });
        labela.append(kontrolaSTerminima);
        vrijednostiOgranicenja.append(labela);
    }
    if (oznacenaOpcija.hasClass("dani")) {
        var labela = $(`<label>${tekst['day']}</label>`);
        var dani = $("<select></select>");
        if (oznacenaOpcija.hasClass("svi")) {
            dani.append(`<option value="">${tekst['anyDay']}</option>`);
        }
        naziviDana.forEach(function(nazivDana) {
            dani.append(`<option value="${nazivDana}">${nazivDana}</option>`);
        });
        labela.append(dani);
        vrijednostiOgranicenja.append(labela);
    }
    if (oznacenaOpcija.hasClass("kolicina")) {
        var donjaGranica = oznacenaOpcija.attr("data-min-value");
        vrijednostiOgranicenja.append(`<label>${tekst['amount']}<input type="number" value="${donjaGranica}" min="${donjaGranica}" max="7" step="1" required="required"/></label>`);
    }
    if (oznacenaOpcija.hasClass("trajanje")) {
        vrijednostiOgranicenja.append(`<label style="display: inline-flex; display: -webkit-inline-flex;">${tekst['duration']}<div class="trajanje"/></label>`);
    }
    if (oznacenaOpcija.hasClass("vrijeme")) {
        vrijednostiOgranicenja.append(`<label>${tekst['time']}<input type="time" required="required"/></label>`);
    }
    if (oznacenaOpcija.hasClass("vikendi")) {
        vrijednostiOgranicenja.append(`<label>${tekst['includeWeekends']}: <input name="ukljuci_vikende" type="checkbox" value="false"/></label>`);
    }
    if (oznacenaOpcija.hasClass("nacin-pretrage")) {
        var jedinstveniIdentifikator = new Date().getTime();
        vrijednostiOgranicenja.append(`<label>${tekst['yes']} <input type="radio" name="${jedinstveniIdentifikator}" value="true"/></label>`);
        vrijednostiOgranicenja.append(`<label>${tekst['no']} <input type="radio" name="${jedinstveniIdentifikator}" value="false" checked="checked"/></label>`);
    }
    if (oznacenaOpcija.hasClass("3-pohadjanje")) {
        var jedinstveniIdentifikator = new Date().getTime();
        vrijednostiOgranicenja.append(`<label>${tekst['mandatory']} <input type="radio" name="${jedinstveniIdentifikator}" value="da"/></label>`);
        vrijednostiOgranicenja.append(`<label>${tekst['optional']} <input type="radio" name="${jedinstveniIdentifikator}" value="mozda" checked="checked"/></label>`);
        vrijednostiOgranicenja.append(`<label>${tekst['excluded']} <input type="radio" name="${jedinstveniIdentifikator}" value="ne" checked="checked"/></label>`);
    }
    if (oznacenaOpcija.hasClass("2-pohadjanje")) {
        var jedinstveniIdentifikator = new Date().getTime();
        vrijednostiOgranicenja.append(`<label>${tekst['mandatoryClass']} <input type="radio" name="${jedinstveniIdentifikator}" value="da"/></label>`);
        vrijednostiOgranicenja.append(`<label>${tekst['doesNotFit']} <input type="radio" name="${jedinstveniIdentifikator}" value="ne" checked="checked"/></label>`);
    }    
    var kontroleSTrajanjem = $(".trajanje", vrijednostiOgranicenja);
    kontroleSTrajanjem.each(function() {
        $(this).timesetter(timesetterOptions);
    });
}

$(document).ready(function() {
    var constraintsDialog;

    $("#calendar").fullCalendar({
        theme: false,
        height: "auto",
        hiddenDays: [0],
        editable: false,
        eventLimit: true,
        lang: momentJsLanguageCode,
        header: {
            left: "prev,next today",
            center: "title",
            right: "agendaWeek,agendaDay"
        },
        defaultView: "agendaWeek",
        minTime: "07:00:00",
        maxTime: "21:00:00",
        defaultDate: moment(fullCalendarDefaultDate, 'YYYY-MM-DD'),
        eventSources: [kodoviRasporeda[0]]
    });

    constraintsDialog = $( "#constraints-dialog-form" ).dialog({
        autoOpen: false,
        height: 400,
        width: "70%",
        modal: true,
        closeOnEscape: false,
        buttons: {
            [`${tekst['addRule']}`]: dodajOgranicenje,  //  dinamičko definiranje ključeva objekta se definira tako da se stavi izraz koji se treba evaluirati unutar uglatih zagrada
            [`${tekst['close']}`]: ispitajIspravnostOgranicenja
        }
    });

    geoMappingDialog = $( "#geo-mapping-dialog-form" ).dialog({
        autoOpen: false,
        width: "auto",
        modal: true,
        closeOnEscape: false,
        buttons: {
            [`${tekst['autofillDistanceTable']}`]: popuniMatricuUdaljenosti,
            [`${tekst['close']}`]: ponistiGeografskePodatke
        }
    });

    $("#tipka-ogranicenja").click(function() {
        $("#forma-ogranicenja select.predmeti").each(function() {     // brisanje ograničenja nad predmetima koje je korisnik ispisao
            if ($(this).val() !== "" && $(this).val() !== "any" && $(`#upisani > option[value="${$(this).val()}"]`).length === 0) {
                $(this).parent().parent().parent().remove();
            }
        });
        $("#forma-ogranicenja select.predmeti").each(function() {
            var prazniElement = $('option[value=""], option[value="any"]', $(this));
            var oznacenaVrijednost = $(this).val();
            var selectbox = $(this);
            selectbox.empty();
            if (prazniElement.length !== 0) {
                selectbox.append(prazniElement);
            }
            selectbox.append($("#upisani > option").clone());
            $(this).val(oznacenaVrijednost);
        });
        constraintsDialog.dialog( "open" );
    });

    $("#forma-ogranicenja").on( "click", ".brisi-ogranicenje", function() {
        $(this).parent().remove();
    });

    $("#forma-ogranicenja").on( "change", "div > label > select", function() {
        if ($(this).val() === "pohadjanjeTermina" && $("#upisani > option").length === 0) {
            alert(`${tekst['noCoursesSelectedError']}`);
            $(this).val($("option:first", $(this)).val());
        }
        else {
            dodajRedakOgranicenja($(this));
        }
    });

    $("#forma-ogranicenja > div > label > select").each(function(index) {
        $(this).val(predikati[index]);
    });

    var zadnjiNameRadioIliCheckboxElementa = null;
    var pozicijaTrenutneVrijednosti = 0;
    $("#forma-ogranicenja > div > span > label > *").each(function() {
        if ($(this).hasClass("relacije")) {
            for (var i=0; i < zgrade.length*zgrade.length; i++) {
                var redoviMatrice = $("tbody tr", $(this));
                var indeksRetka = zgrade.indexOf(vrijednostiOstalihKontrola[pozicijaTrenutneVrijednosti++]);
                var indeksStupca = zgrade.indexOf(vrijednostiOstalihKontrola[pozicijaTrenutneVrijednosti++]);
                var celija = $("td", $(redoviMatrice[indeksRetka+1]))[indeksStupca];
                var kontrolaZaUnosUdaljenosti = $("div.trajanje", $(celija)).timesetter(timesetterOptions);
                var komponenteTrajanja = vrijednostiOstalihKontrola[pozicijaTrenutneVrijednosti++].split(":");
                kontrolaZaUnosUdaljenosti.setHour(komponenteTrajanja[0]).setMinute(komponenteTrajanja[1]);
            }
            return true;
        }
        else if ($(this).hasClass("trajanje")) {
            var komponenteTrajanja = vrijednostiOstalihKontrola[pozicijaTrenutneVrijednosti].split(":");
            $(this).timesetter(timesetterOptions).setHour(komponenteTrajanja[0]).setMinute(komponenteTrajanja[1]);
        }
        else {
            switch ($(this).prop("type")) {
                case "radio":
                case "checkbox":
                    var trenutniNameRadioIliCheckboxElementa = $(this).prop("name");
                    if (trenutniNameRadioIliCheckboxElementa === zadnjiNameRadioIliCheckboxElementa) {
                        pozicijaTrenutneVrijednosti--;
                    }
                    else {
                        zadnjiNameRadioIliCheckboxElementa = trenutniNameRadioIliCheckboxElementa;
                    }
                    if ($(this).val() === vrijednostiOstalihKontrola[pozicijaTrenutneVrijednosti]) {
                        $(this).prop("checked", true);
                    }
                    break;
                default:
                    $(this).val(vrijednostiOstalihKontrola[pozicijaTrenutneVrijednosti]);
            }
        }
        pozicijaTrenutneVrijednosti++;
    });

    $("#forma-ogranicenja").on( "change", "span select.predmeti", function() {
        if ($(this).parent().next().children().first().hasClass("vrste")) {  // tada se radi o odabiru obveznog ili nepristajućeg termina ili o odabiru obveznosti određene vrste nastave nekog predmeta
            var kontrolaSVrstamaNastave = $(this).parent().next().children().first();
            var dosadasnjaVrijednost = kontrolaSVrstamaNastave.val();
            kontrolaSVrstamaNastave.empty();
            if ($('option[value=""]', $(this)).length === 0) {  // tada se radi o odabiru obveznog ili nepristajućeg termina
                Object.keys(serijaliziraniTerminiPoVrstamaPoPredmetima[$(this).val()]).forEach(function(vrsta) {
                    kontrolaSVrstamaNastave.append(`<option value="${vrsta}">${naziviVrsta[vrsta]}</option>`);
                });
                var kontrolaSTerminima = kontrolaSVrstamaNastave.parent().next().children().first();
                kontrolaSTerminima.empty();
                var terminiNastave = serijaliziraniTerminiPoVrstamaPoPredmetima[$(this).val()][kontrolaSVrstamaNastave.val()];
                Object.keys(terminiNastave).forEach(function(val) {
                    var vrijednostTermina = Object.keys(terminiNastave[val])[0];
                    kontrolaSTerminima.append(`<option value="${vrijednostTermina}">${terminiNastave[val][vrijednostTermina]}</option>`);
                });
            }
            else {
                kontrolaSVrstamaNastave.append(`<option value="any">${tekst['anyClassType']}</option>`);
                Object.keys(serijaliziraniTerminiPoVrstamaPoPredmetima[$(this).val()]).forEach(function(vrsta) {
                    kontrolaSVrstamaNastave.append(`<option value="${vrsta}">${naziviVrsta[vrsta]}</option>`);
                });
            }
            if ($(`option[value="${dosadasnjaVrijednost}"]`, kontrolaSVrstamaNastave).length !== 0) {
                kontrolaSVrstamaNastave.val(dosadasnjaVrijednost);
            }
        }
    });

    $("#forma-ogranicenja").on("change", "span select.vrste", function() {
        if ($("option", $(this)).filter(function() { return ["", "any"].indexOf($(this).val()) !== -1 }).length === 0) {  // tada se radi o odabiru obveznog ili nepristajućeg termina
            var kontrolaSPredmetima = $(this).parent().prev().children().first();
            var kontrolaSTerminima = $(this).parent().next().children().first();
            kontrolaSTerminima.empty();
            var terminiNastave = serijaliziraniTerminiPoVrstamaPoPredmetima[kontrolaSPredmetima.val()][$(this).val()];
            Object.keys(terminiNastave).forEach(function(val) {
                var vrijednostTermina = Object.keys(terminiNastave[val])[0];
                kontrolaSTerminima.append(`<option value="${vrijednostTermina}">${terminiNastave[val][vrijednostTermina]}</option>`);
            });
        }        
    });

    $("#distance-matrix-table").ready(function() {
        uciniKontroleNaDijagonaliNepromjenjivima();
    });

    function ispitajIspravnostOgranicenja() {
        var ispravno = true;
        $('#forma-ogranicenja input:not([type="radio"]):not([type="image"])').each(function(){
            var kontrola = $(this);
            if (kontrola.val() === "") {
                ispravno = false;
                privremenoOsvijetliKontrolu(kontrola);
            }
        });
        if (!ispravno) {
            return;
        }
        $("#forma-ogranicenja > div > label > select").first().children().each(function(){  // iteriranje kroz svaku vrstu pravila (neovisno o tome dal je primijenjeno ili ne) te provjeravanje jesu li definirana pravila jedinstvena
            var nazivVrstePravila = $(this).val();
            var velicinaPrimarnogKljuca = parseInt($(this).attr("data-PK-components-num"));
            if (velicinaPrimarnogKljuca === 0) {
                return true;
            }
            var svaIstoimenaPravila = $(`#forma-ogranicenja > div > label > select > option:selected[value="${nazivVrstePravila}"]`).parent();
            if (svaIstoimenaPravila.length === 0) {
                return true;
            }
            if (velicinaPrimarnogKljuca === 1 && svaIstoimenaPravila.length > 1) {
                svaIstoimenaPravila.each(function(){
                    privremenoOsvijetliKontrolu($(this));
                });
                ispravno = false;
                return false;   // preglednije je prikazati u slučaju više parova duplikata samo jedan duplikat pa kod njegovog ispravljanja prikazati i drugi, nego istovremeno prikazati oba (trebalo bi različite parove prikazati različitim bojama i povećati trajanje razdoblja u kojem su prikazane pogreške da ih korisnik sve stigne iščitati)
            }
            velicinaPrimarnogKljuca--;
            var listaRedovaIstoimenihPravilaSVrijednostima = [];
            svaIstoimenaPravila.parent().each(function(){
                var vrijednostiReda = [];
                $("label > *", $(this).next()).each(function(index){
                    if (velicinaPrimarnogKljuca === index) {
                        return false;   // vrijednosti daljnih elemenata pravila su irelevantne (ne smiju biti nedefinirane, a to je već provjereno na samom početku funkcije) pa se ne treba iterirati kroz njihove kontrole
                    }
                    if ($(this).hasClass("trajanje")) {
                        vrijednostiReda.push(`${$("input.timePart.hours", $(this)).val()}:${$("input.timePart.minutes", $(this)).val()}`);
                    }
                    else {
                        vrijednostiReda.push($(this).val());
                    }
                });
                listaRedovaIstoimenihPravilaSVrijednostima.push([$(this).parent(), vrijednostiReda]);
            });
            if (nazivVrstePravila === "maxBrojRupa") {
                var daniSDefiniranimRupama = $.unique($('#forma-ogranicenja > div > label > select > option:selected[value="definicijaRupe"]').parent().parent().next().children().first().children().first().map(function(){return $(this).val()}).toArray());
                if ($.inArray("", daniSDefiniranimRupama) === -1) {
                    listaRedovaIstoimenihPravilaSVrijednostima.forEach(function(elem){
                        var nazivDanaPravila = elem[1][0];
                        if ($.inArray(nazivDanaPravila, daniSDefiniranimRupama) === -1) {
                            alert(`${tekst['gapDefinitionRequiredError']}`);
                            privremenoOsvijetliKontrolu(elem[0]);
                            ispravno = false;
                            return false;
                        }

                    });
                }
            }
            for (var i=0; i<listaRedovaIstoimenihPravilaSVrijednostima.length; i++) {
                arr1 = listaRedovaIstoimenihPravilaSVrijednostima[i];
                for (var j=listaRedovaIstoimenihPravilaSVrijednostima.length-1; j>i; j--) {
                    arr2 = listaRedovaIstoimenihPravilaSVrijednostima[j];
                    if (arr1[1].every(function(value,index) { return value === arr2[1][index]})) {    // ako su vrijednosti primarnih ključeva 2 pravila identične
                        privremenoOsvijetliKontrolu(arr1[0]);
                        privremenoOsvijetliKontrolu(arr2[0]);
                        ispravno = false;
                        return false;
                    }
                }
            }
        });
        if (ispravno) {
            constraintsDialog.dialog( "close" );
        }
    }
});

function showBuildingLocationDefinitionWindow() {
    if (googleMapsApiKey === "") {
        alert(`${tekst['apiKeyRequiredForDistanceMatrixAutofill']}`);
        return;
    }
    var distanceMatrices = $("#forma-ogranicenja > div > label:first-child > select").filter(function() {return $(this).val() === "trajanjePutovanjaIzmedjuZgrada"});
    if (distanceMatrices.length > 1) {
        distanceMatrices.each(function() {privremenoOsvijetliKontrolu($(this))});
        return;
    }
    $("#forma-pozicija-zgrada > table > tbody > tr").each(function(){
        var addressField = $("input.address", $(this));
        var geocoordinatesField = $("input.geocoordinates", $(this));
        addressField.attr("data-old", addressField.val());
        addressField.attr("data-geocode-status-old", addressField.attr("data-geocode-status"));
        geocoordinatesField.attr("data-old", geocoordinatesField.val());
    });
    geoMappingDialog.dialog( "open" );
    if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
    }
    else {
        google.maps.event.trigger(map, "resize");
    }
}

function toggleDistanceMatrixSymmetricity(cb) {
    var prviRedak = true;
    var redoviMatrice = $("#distance-matrix-table > tbody > tr");
    var matricnaSimetricna = cb.checked;
    redoviMatrice.each(function(indexRetka, redak) {
        redak = $(redak);
        if (prviRedak) {
            prviRedak = false;
            return;
        }
        redak.children().each(function(indexStupca, celija) {
            if (indexRetka === indexStupca) {
                return false;
            }
            if (indexStupca === 0) {
                return true;
            }
            var kontrolaZaUnosUdaljenosti = $('div.trajanje', $(celija)).timesetter(timesetterOptions);
            var simetricnaKontrolaZaUnosUdaljenosti = $('div.trajanje', redoviMatrice[indexStupca].children[indexRetka]).timesetter(timesetterOptions);
            if (matricnaSimetricna) {
                kontrolaZaUnosUdaljenosti.setHour(simetricnaKontrolaZaUnosUdaljenosti.getHoursValue());
                kontrolaZaUnosUdaljenosti.setMinute(simetricnaKontrolaZaUnosUdaljenosti.getMinutesValue());
                simetricnaKontrolaZaUnosUdaljenosti.change(function() {
                    setTimeout(function() {
                        if (simetricnaKontrolaZaUnosUdaljenosti.getTotalMinutes() !== kontrolaZaUnosUdaljenosti.getTotalMinutes()) {
                            kontrolaZaUnosUdaljenosti.setHour(simetricnaKontrolaZaUnosUdaljenosti.getHoursValue());
                            kontrolaZaUnosUdaljenosti.setMinute(simetricnaKontrolaZaUnosUdaljenosti.getMinutesValue());
                        }
                    }, 100);
                });
                kontrolaZaUnosUdaljenosti.change(function() {
                    setTimeout(function() {
                        if (simetricnaKontrolaZaUnosUdaljenosti.getTotalMinutes() !== kontrolaZaUnosUdaljenosti.getTotalMinutes()) {
                            simetricnaKontrolaZaUnosUdaljenosti.setHour(kontrolaZaUnosUdaljenosti.getHoursValue());
                            simetricnaKontrolaZaUnosUdaljenosti.setMinute(kontrolaZaUnosUdaljenosti.getMinutesValue());
                        }
                    }, 100);
                });
            }
            else {
                kontrolaZaUnosUdaljenosti.unbind('change');
                simetricnaKontrolaZaUnosUdaljenosti.unbind('change');
            }
        });
    });
}

function uciniKontroleNaDijagonaliNepromjenjivima() {
    var prviRedak = true;
    var redoviMatrice = $('#distance-matrix-table > tbody > tr');
    redoviMatrice.each(function(indexRetka, redak) {
        redak = $(redak);
        if (prviRedak) {
            prviRedak = false;
            return;
        }
        redak.children().each(function(indexStupca, celija) {
            if (indexStupca === 0) {
                return true;
            }
            if (indexRetka === indexStupca) {
                $('input', $(celija)).each(function() {
                    $(this).attr('disabled', 'disabled');
                });
                $('div.updownButton', $(celija)).each(function() {
                    $(this).unbind('click');
                });
            }
        });
    });
}