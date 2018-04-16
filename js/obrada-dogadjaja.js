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
    $("#forma-ogranicenja > div").each(function(){
        var glavniSelectbox = $(":first-child > select", $(this)).first();
        var nazivPredikata = glavniSelectbox.val();
        if (nazivPredikata === '') {
            return true;    // ponaša se kao continue
        }
        var parametri = [];
        $('span > label > *', $(this)).each(function(){
            if ($(this).hasClass("trajanje")) {
                parametri.push('trajanje(' + $("input.timePart.hours", $(this)).val() + "," + $("input.timePart.minutes", $(this)).val() + ')');
            }
            else {
                switch ($(this).prop("type")) {
                    case "checkbox":
                        parametri.push(!$(this).prop('checked'));
                        break;
                    case "radio":
                        if ($(this).is(':checked')) {
                            parametri.push($(this).val());
                        }
                        break;
                    case "time":
                        var vremenskeKomponente = $(this).val().split(':');
                        parametri.push('vrijeme(' + vremenskeKomponente[0] + ',' + vremenskeKomponente[1] + ')');
                        break;
                    case "number":
                        parametri.push($(this).val());
                        break;
                    default:
                        parametri.push("'" + $(this).val() + "'");
                }
            }
        });
        $("#ogranicenja").append('<option value="' + nazivPredikata + '(' + parametri.join(',') + ')"></option>');
    });
    $("#ogranicenja option").each(function(){
        $(this).prop("selected", true);
    });

    $("#serijalizirana-forma-ogranicenja").val($("#forma-ogranicenja").html());
});

$("#prvi").click(function() {
    $("#trenutna-kombinacija").html(1);
    ucitajRaspored(1);
});

$("#prethodni").click(function() {
    var elementSBrojem = $("#trenutna-kombinacija");
    var brojKombinacije = parseInt(elementSBrojem.html())-1;
    if (brojKombinacije >= 1) {
        elementSBrojem.html(brojKombinacije);
        ucitajRaspored(brojKombinacije);
    }
});

$("#sljedeci").click(function() {
    var elementSBrojem = $("#trenutna-kombinacija");
    var brojKombinacije = parseInt(elementSBrojem.html())+1;
    if (brojKombinacije <= brojKombinacijaRasporeda) {
        elementSBrojem.html(brojKombinacije);
        ucitajRaspored(brojKombinacije);
    }
});

$("#posljedni").click(function() {
    $("#trenutna-kombinacija").html(brojKombinacijaRasporeda);
    ucitajRaspored(brojKombinacijaRasporeda);
});

function ucitajRaspored(pozicija) {
    $('#calendar').fullCalendar('removeEvents');
    $('#calendar').fullCalendar('addEventSource', kodoviRasporeda[pozicija-1]);
    $('#calendar').fullCalendar('refetchEvents');
}

function dodajOgranicenje() {
    var dodaniElement;
    $("#forma-ogranicenja").append(
        dodaniElement = $(`
        <div>
            <label>Pravilo:
                <select>
                    <option class="trajanje predmeti svi"   data-PK-components-num="2"                      value="maxSatiPredmeta"                         >najveći broj sati predmeta tjedno</option>
                    <option class="svi dani trajanje"       data-PK-components-num="2"                      value="maxTrajanjeBoravkaNaFaksu"               >najveće trajanje boravka na fakultetu</option>
                    <option class="svi dani trajanje"       data-PK-components-num="2"                      value="minTrajanjeNastave"                      >najmanje trajanje nastave dnevno</option>
                    <option class="svi dani trajanje"       data-PK-components-num="2"                      value="maxTrajanjeNastave"                      >najveće trajanje nastave dnevno</option>
                    <option class="svi dani kolicina"       data-PK-components-num="2"  data-min-value="1"  value="maxBrojRupa"                             >najveći broj rupa</option>
                    <option class="svi dani trajanje"       data-PK-components-num="2"                      value="maxTrajanjeRupe"                         >najveće dopušteno trajanje vremenskog razmaka</option>
                    <option class="svi dani vrijeme"        data-PK-components-num="2"                      value="najranijiPocetak"                        >najraniji početak nastave</option>
                    <option class="svi dani vrijeme"        data-PK-components-num="2"                      value="najkasnijiZavrsetak"                     >najkasniji završetak nastave</option>
                    <option class="dani"                    data-PK-components-num="2"                      value="bezNastaveNaDan"                         >dan bez nastave</option>
                    <option class="kolicina vikendi"        data-PK-components-num="1"  data-min-value="1"  value="minBrojDanaBezNastave"                   >najmanji broj dana bez nastave</option>
                    <option class="kolicina trajanje"       data-PK-components-num="3"  data-min-value="2"  value="maxBrojUzastopnihDanaDugoTrajanjeNastave">najveći uzastopni broj dana s predugo nastave</option>
                    <option class="kolicina vrijeme"        data-PK-components-num="3"  data-min-value="2"  value="maxBrojUzastopnihDanaRaniPocetak"        >najveći uzastopni broj dana s prerano nastave</option>
                    <option class="kolicina trajanje"       data-PK-components-num="3"  data-min-value="1"  value="maxBrojDanaDugoTrajanjeNastave"          >najveći broj dana s predugo nastave</option>
                    <option class="kolicina vrijeme"        data-PK-components-num="3"  data-min-value="1"  value="maxBrojDanaRaniPocetak"                  >najveći broj dana s prerano nastave</option>
                    <option class="radio"                   data-PK-components-num="1"                      value="dohvatiRaspored"                         >samo obvezna nastava</option>
                    <option class="trajanje"                data-PK-components-num="1"                      value="trajanjePutovanjaDoDrugeZgrade"          >trajanje putovanja od jedne zgrade do druge</option>
                    <option class="svi dani trajanje"       data-PK-components-num="2"                      value="definicijaRupe"                          >definicija rupe</option>
                </select>
            </label>
            <span></span>
            <input type="image" src="http://www.free-icons-download.net/images/button-delete-icon-4489.png" class="brisi-ogranicenje"/>
        </div>
        `)
    );
    dodajRedakOgranicenja($(':first-child > select', dodaniElement).first());
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
        var svaIstoimenaPravila = $('#forma-ogranicenja > div > label > select > option:selected[value="' + oznacenaOpcija.val() + '"]').parent();
        if (svaIstoimenaPravila.length > 1) {
            svaIstoimenaPravila.each(function(){
                privremenoOsvijetliKontrolu($(this));
            });
        }
    }
    if (oznacenaOpcija.hasClass("predmeti")) {
        var labela = $('<label>Predmet: </label>');
        var predmeti = $('<select class="predmeti"></select>');
        if (oznacenaOpcija.hasClass("svi")) {
            predmeti.append('<option value="">svaki</option>');
        }
        $("#upisani > option").each(function() {
            var naziv = $(this).val();
            predmeti.append('<option value="' + naziv + '">' + naziv + '</option>');
        });
        labela.append(predmeti);
        vrijednostiOgranicenja.append(labela);
    }
    if (oznacenaOpcija.hasClass("dani")) {
        var labela = $('<label>Dan: </label>');
        var dani = $('<select></select>');
        if (oznacenaOpcija.hasClass("svi")) {
            dani.append('<option value="">svaki</option>');
        }
        ['ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota', 'nedjelja'].forEach(function(nazivDana) {
            dani.append('<option value="' + nazivDana + '">' + nazivDana + '</option>');
        });
        labela.append(dani);
        vrijednostiOgranicenja.append(labela);
    }
    if (oznacenaOpcija.hasClass("kolicina")) {
        var donjaGranica = oznacenaOpcija.attr("data-min-value");
        vrijednostiOgranicenja.append('<label>Broj: <input type="number" value="' + donjaGranica + '" min="' + donjaGranica + '" max="7" step="1" required="required"/></label>');
    }
    if (oznacenaOpcija.hasClass("trajanje")) {
        vrijednostiOgranicenja.append('<label style="display: inline-flex; display: -webkit-inline-flex;">Trajanje: <div class="trajanje"/></label>');
    }
    if (oznacenaOpcija.hasClass("vrijeme")) {
        vrijednostiOgranicenja.append('<label>Vrijeme: <input type="time" required="required"/></label>');
    }
    if (oznacenaOpcija.hasClass("vikendi")) {
        vrijednostiOgranicenja.append('<label>Uključi vikende: <input type="checkbox"/></label>')
    }
    if (oznacenaOpcija.hasClass("radio")) {
        vrijednostiOgranicenja.append('<label>Da <input type="radio" name="dohvatiRaspored" value="true"/></label>');
        vrijednostiOgranicenja.append('<label>Ne <input type="radio" name="dohvatiRaspored" value="false" checked="checked"/></label>');
    }
    $(".trajanje", vrijednostiOgranicenja).timesetter({
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
        numberPaddingChar: '0' // number left padding character ex: 00052
    });
}

$(document).ready(function() {
    var dialog, form;

    $('#calendar').fullCalendar({
        theme: false,
        height: "auto",
        hiddenDays: [0],
        editable: false,
        eventLimit: true,
        lang: 'hr',
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay'
        },
        defaultView: 'agendaWeek',
        minTime: '07:00:00',
        maxTime: '21:00:00',
        defaultDate: new Date().toString('dd-MM-yyyy'),
        eventSources: [kodoviRasporeda[0]]
    });
    setTimeout(function() {
        $('button.fc-today-button').trigger('click');
    }, 100);

    dialog = $( "#dialog-form" ).dialog({
        autoOpen: false,
        height: 400,
        width: '70%',
        modal: true,
        closeOnEscape: false,
        buttons: {
            "Dodaj ograničenje": dodajOgranicenje,
            "Natrag": ispitajIspravnostOgranicenja
        }
    });

    $("#tipka-ogranicenja").click(function() {
        $("#forma-ogranicenja select.predmeti").each(function() {     // brisanje ograničenja nad predmetima koje je korisnik ispisao
            if ($(this).val() !== "" && $('#upisani > option[value="' + $(this).val() + '"]').length === 0) {
                $(this).parent().parent().remove();
            }
        });
        $("#forma-ogranicenja select.predmeti").each(function() {
            var postojiPrazniElement = $('option[value=""]', $(this)).length !== 0;
            var oznacenaVrijednost = $(this).val();
            $(this).empty();
            var selectbox = $(this);
            if (postojiPrazniElement) {
                selectbox.append('<option value="">svaki</option>');
            }
            $("#upisani > option").each(function(){
                selectbox.append('<option value="' + $(this).val() + '">' + $(this).val() + '</option>');
            });
            $(this).val(oznacenaVrijednost);
        });
        dialog.dialog( "open" );
    });

    $("#forma-ogranicenja").on( "click", ".brisi-ogranicenje", function() {
        $(this).parent().remove();
    });

    $("#forma-ogranicenja").on( "change", "div > label > select", function() {
        dodajRedakOgranicenja($(this));
    });

    $('#forma-ogranicenja > div > label > select').each(function(index){
        $(this).val(predikati[index]);
    });

    $('#forma-ogranicenja > div > span > label > :not(:radio), #forma-ogranicenja > div > span > label:first > :radio').each(function(index){
        if ($(this).hasClass("trajanje")) {
            var komponenteTrajanja = vrijednostiOstalihKontrola[index].split(":");
            $(this).timesetter().setHour(komponenteTrajanja[0]).setMinute(komponenteTrajanja[1]);
        }
        else {
            if ($(this).prop("type") === "radio") {
                var radio = $(this);
                while (radio.val() != (vrijednostiOstalihKontrola[index] ? "true" : "false")) {
                    radio = radio.parent().next().children().first();
                    if (radio.length === 0) {
                        true;
                    }
                }
                radio.prop("checked", true);
            }
            else {
                $(this).val(vrijednostiOstalihKontrola[index]);
            }
        }
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
        $('#forma-ogranicenja > div > label > select').first().children().each(function(){  // iteriranje kroz svaku vrstu pravila (neovisno o tome dal je primijenjeno ili ne) te provjeravanje jesu li definirana pravila jedinstvena
            var nazivVrstePravila = $(this).val();
            var velicinaPrimarnogKljuca = parseInt($(this).attr("data-PK-components-num"));
            if (velicinaPrimarnogKljuca === 0) {
                return true;
            }
            var svaIstoimenaPravila = $('#forma-ogranicenja > div > label > select > option:selected[value="' + nazivVrstePravila + '"]').parent();
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
                $("label > :input, label > div", $(this).next()).each(function(index){
                    if (velicinaPrimarnogKljuca === index) {
                        return false;   // vrijednosti daljnih elemenata pravila su irelevantne (ne smiju biti nedefinirane, a to je već provjereno na samom početku funkcije) pa se ne treba iterirati kroz njihove kontrole
                    }
                    if ($(this).hasClass("trajanje")) {
                        vrijednostiReda.push($("input.timePart.hours", $(this)).val() + ":" + $("input.timePart.minutes", $(this)).val());
                    }
                    else {
                        vrijednostiReda.push($(this).val());
                    }
                });
                listaRedovaIstoimenihPravilaSVrijednostima.push([$(this).parent(), vrijednostiReda]);
            });
            if (nazivVrstePravila === "maxBrojRupa") {
                var daniSDefiniranimRupama = $.unique($('#forma-ogranicenja > div > label > select > option:selected[value="definicijaRupe"]').parent().parent().next().children().first().children().first().map(function(){return $(this).val()}).toArray());
                if ($.inArray('', daniSDefiniranimRupama) === -1) {
                    listaRedovaIstoimenihPravilaSVrijednostima.forEach(function(elem){
                        var nazivDanaPravila = elem[1][0];
                        if ($.inArray(nazivDanaPravila, daniSDefiniranimRupama) === -1) {
                            alert("Postoji pravilo koje definira maksimalni broj rupa pri čemu nije postavljeno pripadajuće pravilo 'definicija rupe'");
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
            dialog.dialog( "close" );
        }
    }
});
