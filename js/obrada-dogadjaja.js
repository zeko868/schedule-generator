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
    $("#forma-ogranicenja > div").each(function(){
        var glavniSelectbox = $(":first-child > select", $(this)).first();
        var nazivPredikata = glavniSelectbox.val();
        if (nazivPredikata === "") {
            return true;    // ponaša se kao continue
        }
        var parametri = [];
        $("span > label > *", $(this)).each(function(){
            if ($(this).hasClass("trajanje")) {
                parametri.push("trajanje(" + $("input.timePart.hours", $(this)).val() + "," + $("input.timePart.minutes", $(this)).val() + ")");
            }
            else {
                var vrijednost = $(this).val().toString().replace("'", "\'");
                switch ($(this).prop("type")) {
                    case "checkbox":
                        parametri.push("'" + !$(this).prop("checked") + "'");
                        break;
                    case "radio":
                        if ($(this).is(":checked")) {
                            parametri.push("'" + vrijednost + "'");
                        }
                        break;
                    case "time":
                        var vremenskeKomponente = vrijednost.split(":");
                        parametri.push("vrijeme(" + vremenskeKomponente[0] + "," + vremenskeKomponente[1] + ")");
                        break;
                    case "number":
                        parametri.push(vrijednost);
                        break;
                    default:
                        if ($(this).hasClass("termini")) {
                            parametri.push(vrijednost);
                        }
                        else {
                            parametri.push("'" + vrijednost + "'");
                        }
                }
            }
        });
        $("#ogranicenja").append('<option value="' + nazivPredikata + '(' + parametri.join(",") + ')"></option>');
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
    $("#calendar").fullCalendar("removeEvents");
    $("#calendar").fullCalendar("addEventSource", kodoviRasporeda[pozicija-1]);
    $("#calendar").fullCalendar("refetchEvents");
}

function dodajOgranicenje() {
    var dodaniElement;
    $("#forma-ogranicenja").append(
        dodaniElement = $(`
        <div>
            <label>Pravilo:
                <select>
                    <option class="trajanje predmeti svi"               data-PK-components-num="2"                      value="maxSatiPredmeta"                         >najveći broj sati predmeta tjedno</option>
                    <option class="svi dani trajanje"                   data-PK-components-num="2"                      value="maxTrajanjeBoravkaNaFaksu"               >najveće trajanje boravka na fakultetu</option>
                    <option class="svi dani trajanje"                   data-PK-components-num="2"                      value="minTrajanjeNastave"                      >najmanje trajanje nastave</option>
                    <option class="svi dani trajanje"                   data-PK-components-num="2"                      value="maxTrajanjeNastave"                      >najveće trajanje nastave</option>
                    <option class="svi dani kolicina"                   data-PK-components-num="2"  data-min-value="1"  value="maxBrojRupa"                             >najveći broj rupa</option>
                    <option class="svi dani trajanje"                   data-PK-components-num="2"                      value="maxTrajanjeRupe"                         >najveće dopušteno trajanje vremenskog razmaka</option>
                    <option class="svi dani vrijeme"                    data-PK-components-num="2"                      value="najranijiPocetak"                        >najraniji početak nastave</option>
                    <option class="svi dani vrijeme"                    data-PK-components-num="2"                      value="najkasnijiZavrsetak"                     >najkasniji završetak nastave</option>
                    <option class="dani"                                data-PK-components-num="2"                      value="bezNastaveNaDan"                         >dan bez nastave</option>
                    <option class="kolicina vikendi"                    data-PK-components-num="1"  data-min-value="1"  value="minBrojDanaBezNastave"                   >najmanji broj dana bez nastave</option>
                    <option class="kolicina trajanje"                   data-PK-components-num="3"  data-min-value="2"  value="maxBrojUzastopnihDanaDugoTrajanjeNastave">najveći uzastopni broj dana s predugo nastave</option>
                    <option class="kolicina vrijeme"                    data-PK-components-num="3"  data-min-value="2"  value="maxBrojUzastopnihDanaRaniPocetak"        >najveći uzastopni broj dana s prerano nastave</option>
                    <option class="kolicina trajanje"                   data-PK-components-num="3"  data-min-value="1"  value="maxBrojDanaDugoTrajanjeNastave"          >najveći broj dana s predugo nastave</option>
                    <option class="kolicina vrijeme"                    data-PK-components-num="3"  data-min-value="1"  value="maxBrojDanaRaniPocetak"                  >najveći broj dana s prerano nastave</option>
                    <option class="nacin-pretrage"                      data-PK-components-num="1"                      value="dohvatiRaspored"                         >samo obvezna nastava</option>
                    <option class="trajanje"                            data-PK-components-num="1"                      value="trajanjePutovanjaDoDrugeZgrade"          >trajanje putovanja od jedne zgrade do druge</option>
                    <option class="svi dani trajanje"                   data-PK-components-num="2"                      value="definicijaRupe"                          >definicija rupe</option>
                    <option class="svi predmeti vrste 3-pohadjanje"     data-PK-components-num="2"                      value="pohadjanjeNastave"                       >pohađanje nastave</option>
                    <option class="predmeti vrste termini 2-pohadjanje" data-PK-components-num="3"                      value="pohadjanjeTermina"                       >pohađanje određenog termina</option>
                </select>
            </label>
            <span></span>
            <input type="image" src="http://www.free-icons-download.net/images/button-delete-icon-4489.png" class="brisi-ogranicenje"/>
        </div>
        `)
    );
    dodajRedakOgranicenja($(":first-child > select", dodaniElement).first());
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
        var labela = $("<label>Predmet: </label>");
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
    if (oznacenaOpcija.hasClass("vrste")) {
        var labela = $("<label>Vrsta: </label>");
        var vrste = $('<select class="vrste"></select>');
        if (oznacenaOpcija.hasClass("svi")) {
            vrste.append('<option value="any">svaki</option>');
            Object.keys(serijaliziraniTerminiPoVrstamaPoPredmetima['']).forEach(function(vrsta) {
                vrste.append('<option value="' + vrsta + '">' + naziviVrsta[vrsta] + '</option>');
            });
        }
        else {
            Object.keys(serijaliziraniTerminiPoVrstamaPoPredmetima[$("#upisani > option").first().val()]).forEach(function(vrsta) {
                vrste.append('<option value="' + vrsta + '">' + naziviVrsta[vrsta] + '</option>');
            });
        }
        labela.append(vrste);
        vrijednostiOgranicenja.append(labela);
    }
    if (oznacenaOpcija.hasClass("termini")) {
        var labela = $("<label>Termin: </label>");
        var kontrolaSTerminima = $('<select class="termini"></select>');
        var kontrolePravila = glavniSelectbox.parent().next();
        var terminiNastave = serijaliziraniTerminiPoVrstamaPoPredmetima[$("select.predmeti", kontrolePravila).val()][$("select.vrste", kontrolePravila).val()];
        Object.keys(terminiNastave).forEach(function(val) {
            var vrijednostTermina = Object.keys(terminiNastave[val])[0];
            kontrolaSTerminima.append('<option value="' + vrijednostTermina + '">' + terminiNastave[val][vrijednostTermina] + '</option>');
        });
        labela.append(kontrolaSTerminima);
        vrijednostiOgranicenja.append(labela);
    }
    if (oznacenaOpcija.hasClass("dani")) {
        var labela = $("<label>Dan: </label>");
        var dani = $("<select></select>");
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
        vrijednostiOgranicenja.append('<label>Uključi vikende: <input name="ukljuci_vikende" type="checkbox" value="false"/></label>');
    }
    if (oznacenaOpcija.hasClass("nacin-pretrage")) {
        var jedinstveniIdentifikator = new Date().getTime();
        vrijednostiOgranicenja.append('<label>Da <input type="radio" name="' + jedinstveniIdentifikator + '" value="true"/></label>');
        vrijednostiOgranicenja.append('<label>Ne <input type="radio" name="' + jedinstveniIdentifikator + '" value="false" checked="checked"/></label>');
    }
    if (oznacenaOpcija.hasClass("3-pohadjanje")) {
        var jedinstveniIdentifikator = new Date().getTime();
        vrijednostiOgranicenja.append('<label>Obvezno <input type="radio" name="' + jedinstveniIdentifikator + '" value="da"/></label>');
        vrijednostiOgranicenja.append('<label>Opcionalno <input type="radio" name="' + jedinstveniIdentifikator + '" value="mozda" checked="checked"/></label>');
        vrijednostiOgranicenja.append('<label>Zabranjeno <input type="radio" name="' + jedinstveniIdentifikator + '" value="ne" checked="checked"/></label>');
    }
    if (oznacenaOpcija.hasClass("2-pohadjanje")) {
        var jedinstveniIdentifikator = new Date().getTime();
        vrijednostiOgranicenja.append('<label>Obvezna grupa <input type="radio" name="' + jedinstveniIdentifikator + '" value="da"/></label>');
        vrijednostiOgranicenja.append('<label>Ne pristaje <input type="radio" name="' + jedinstveniIdentifikator + '" value="ne" checked="checked"/></label>');
    }    
    var kontrolaSTrajanjem = $(".trajanje", vrijednostiOgranicenja);
    if (kontrolaSTrajanjem.length !== 0) {
        kontrolaSTrajanjem.timesetter({
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
        });
    }
}

$(document).ready(function() {
    var dialog, form;

    $("#calendar").fullCalendar({
        theme: false,
        height: "auto",
        hiddenDays: [0],
        editable: false,
        eventLimit: true,
        lang: "hr",
        header: {
            left: "prev,next today",
            center: "title",
            right: "month,agendaWeek,agendaDay"
        },
        defaultView: "agendaWeek",
        minTime: "07:00:00",
        maxTime: "21:00:00",
        defaultDate: new Date().toString("dd-MM-yyyy"),
        eventSources: [kodoviRasporeda[0]]
    });
    setTimeout(function() {
        $("button.fc-today-button").trigger("click");
    }, 100);

    dialog = $( "#dialog-form" ).dialog({
        autoOpen: false,
        height: 400,
        width: "70%",
        modal: true,
        closeOnEscape: false,
        buttons: {
            "Dodaj ograničenje": dodajOgranicenje,
            "Natrag": ispitajIspravnostOgranicenja
        }
    });

    $("#tipka-ogranicenja").click(function() {
        $("#forma-ogranicenja select.predmeti").each(function() {     // brisanje ograničenja nad predmetima koje je korisnik ispisao
            if ($(this).val() !== "" && $(this).val() !== "any" && $('#upisani > option[value="' + $(this).val() + '"]').length === 0) {
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
        if ($(this).val() === "pohadjanjeTermina" && $("#upisani > option").length === 0) {
            alert("Odabrano pravilo se ne može definirati ako nije upisan nijedan predmet!");
            $(this).val($("option:first", $(this)).val());
        }
        else {
            dodajRedakOgranicenja($(this));
        }
    });

    $("#forma-ogranicenja > div > label > select").each(function(index){
        $(this).val(predikati[index]);
    });

    var zadnjiNameRadioIliCheckboxElementa = null;
    var pozicijaTrenutneVrijednosti = 0;
    $("#forma-ogranicenja > div > span > label > :input").each(function(){
        if ($(this).hasClass("trajanje")) {
            var komponenteTrajanja = vrijednostiOstalihKontrola[pozicijaTrenutneVrijednosti].split(":");
            $(this).timesetter().setHour(komponenteTrajanja[0]).setMinute(komponenteTrajanja[1]);
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
        if ($('option[value=""]', $(this)).length === 0) {  // tada se radi o odabiru obveznog ili nepristajućeg termina ili o odabiru obveznosti određene vrste nastave nekog predmeta
            var kontrolaSVrstamaNastave = $(this).parent().next().children().first();
            kontrolaSVrstamaNastave.empty();
            if ($("option", $(this)).filter(function() { return $(this).html() === "svaki" }).length === 0) {  // tada se radi o odabiru obveznog ili nepristajućeg termina
                Object.keys(serijaliziraniTerminiPoVrstamaPoPredmetima[$(this).val()]).forEach(function(vrsta) {
                    kontrolaSVrstamaNastave.append('<option value="' + vrsta + '">' + naziviVrsta[vrsta] + '</option>');
                });
                var kontrolaSTerminima = kontrolaSVrstamaNastave.parent().next().children().first();
                kontrolaSTerminima.empty();
                var terminiNastave = serijaliziraniTerminiPoVrstamaPoPredmetima[$(this).val()][kontrolaSVrstamaNastave.val()];
                Object.keys(terminiNastave).forEach(function(val) {
                    var vrijednostTermina = Object.keys(terminiNastave[val])[0];
                    kontrolaSTerminima.append('<option value="' + vrijednostTermina + '">' + terminiNastave[val][vrijednostTermina] + '</option>');
                });
            }
            else {
                kontrolaSVrstamaNastave.append('<option value="any">svaki</option>');
                Object.keys(serijaliziraniTerminiPoVrstamaPoPredmetima[$(this).val()]).forEach(function(vrsta) {
                    kontrolaSVrstamaNastave.append('<option value="' + vrsta + '">' + naziviVrsta[vrsta] + '</option>');
                });
            }
        }
    });

    $("#forma-ogranicenja").on("change", "span select.vrste", function() {
        if ($("option", $(this)).filter(function() { return $(this).html() === "svaki" }).length === 0) {  // tada se radi o odabiru obveznog ili nepristajućeg termina
            var kontrolaSPredmetima = $(this).parent().prev().children().first();
            var kontrolaSTerminima = $(this).parent().next().children().first();
            kontrolaSTerminima.empty();
            var terminiNastave = serijaliziraniTerminiPoVrstamaPoPredmetima[kontrolaSPredmetima.val()][$(this).val()];
            Object.keys(terminiNastave).forEach(function(val) {
                var vrijednostTermina = Object.keys(terminiNastave[val])[0];
                kontrolaSTerminima.append('<option value="' + vrijednostTermina + '">' + terminiNastave[val][vrijednostTermina] + '</option>');
            });
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
        $("#forma-ogranicenja > div > label > select").first().children().each(function(){  // iteriranje kroz svaku vrstu pravila (neovisno o tome dal je primijenjeno ili ne) te provjeravanje jesu li definirana pravila jedinstvena
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
                if ($.inArray("", daniSDefiniranimRupama) === -1) {
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
