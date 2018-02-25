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
            switch ($(this).prop("type")) {
                case "checkbox":
                    parametri.push(!$(this).prop('checked'));
                    break;
                case "time":
                    var vremenskeKomponente = $(this).val().split(':');
                    var znacenjeVremena = $('option:selected', glavniSelectbox).first().hasClass('vrijeme') ? 'vrijeme' : 'trajanje';
                    parametri.push(znacenjeVremena + '(' + vremenskeKomponente[0] + ',' + vremenskeKomponente[1] + ')');
                    break;
                case "number":
                    parametri.push($(this).val());
                    break;
                default:
                    if ($(this).val() !== "") {
                        parametri.push("'" + $(this).val() + "'");
                    }
            }
        });
        $("#ogranicenja").append('<option value="' + nazivPredikata + '(' + parametri.join(',') + ')"></option>');
    });
    var vrstaPretrage = $('input[name="vrsta"]:checked').val();
    if (vrstaPretrage === undefined) {
        vrstaPretrage = 'dohvatiNadobudniRaspored';
    }
    $("#ogranicenja").append('<option value="' + vrstaPretrage + '()"></option');
    $("#ogranicenja option").each(function(){
        $(this).prop("selected", true);
    });

    $('#serijalizirana-forma-ogranicenja').val($("#forma-ogranicenja").html());
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
                    <option class="trajanje predmeti svi" value="maxSatiPredmeta">najveći broj sati predmeta dnevno</option>
                    <option class="svi dani trajanje" value="maxTrajanjeBoravkaNaFaksu">najveće trajanje boravka na fakultetu</option>
                    <option class="svi dani trajanje" value="minTrajanjeNastave">najmanje trajanje nastave dnevno</option>
                    <option class="svi dani trajanje" value="maxTrajanjeNastave">najveće trajanje nastave dnevno</option>
                    <option class="svi dani kolicina" value="maxBrojRupa">najveći broj rupa</option>
                    <option class="svi dani trajanje" value="maxTrajanjeRupe">najveće dopušteno trajanje rupe</option>
                    <option class="svi dani vrijeme" value="najranijiPocetak">najraniji početak nastave</option>
                    <option class="svi dani vrijeme" value="najkasnijiZavrsetak">najkasniji završetak nastave</option>
                    <option class="dani" value="bezNastaveNaDan">dan bez nastave</option>
                    <option class="kolicina vikendi" value="minBrojDanaBezNastave">najmanji broj dana bez nastave</option>
                    <option class="kolicina trajanje" value="maxBrojUzastopnihDanaMaxTrajanjeNastave">najveći uzastopni broj dana s predugo nastave</option>
                    <option class="kolicina vrijeme" value="maxBrojUzastopnihDanaNajranijiPocetak">najveći uzastopni broj dana s prerano nastave</option>
                    <option class="kolicina trajanje" value="maxBrojDanaMaxTrajanjeNastave">najveći broj dana s predugo nastave</option>
                    <option class="kolicina vrijeme" value="maxBrojDanaNajranijiPocetak">najveći broj dana s prerano nastave</option>
                    <option class="radio" value="">način pretrage</option>
                    <option class="trajanje" value="trajanjePutovanjaDoDrugeZgrade">trajanje putovanja od jedne zgrade do druge</option>
                    <option class="svi dani trajanje" value="definicijaRupe">definicija rupe</option>
                </select>
            </label>
            <span></span>
            <input type="image" src="http://www.free-icons-download.net/images/button-delete-icon-4489.png" class="brisi-ogranicenje"/>
        </div>
        `)
    );
    dodajRedakOgranicenja($(':first-child > select', dodaniElement).first());
}

function dodajRedakOgranicenja(glavniSelectbox) {
    var vrijednostiOgranicenja = glavniSelectbox.parent().next();
    vrijednostiOgranicenja.empty();
    var oznacenaOpcija = $("option:selected", glavniSelectbox);
    if (oznacenaOpcija.hasClass("predmeti")) {
        var labela = $('<label>Predmet: </label>');
        var predmeti = $('<select class="predmeti"></select>');
        if (oznacenaOpcija.hasClass("svi")) {
            predmeti.append('<option value="">svaki</option>');
        }
        $("#upisani > option").each(function() {
            var naziv = $(this).val();
            predmeti.append('<option name="' + naziv + '">' + naziv + '</option>');
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
        vrijednostiOgranicenja.append('<label>Broj: <input type="number" value="1" min="1" max="7" step="1" required="required"/></label>');
    }
    if (oznacenaOpcija.hasClass("trajanje")) {
        vrijednostiOgranicenja.append('<label>Trajanje: <input type="time" required="required"/></label>');
    }
    if (oznacenaOpcija.hasClass("vrijeme")) {
        vrijednostiOgranicenja.append('<label>Vrijeme: <input type="time" required="required"/></label>');
    }
    if (oznacenaOpcija.hasClass("vikendi")) {
        vrijednostiOgranicenja.append('<label>Uključi vikende: <input type="checkbox"/></label>')
    }
    if (oznacenaOpcija.hasClass("radio")) {
        vrijednostiOgranicenja.append('<label>Dohvati lijeni raspored <input type="radio" id="lijeni" name="vrsta" value="dohvatiLijeniRaspored"/></label>');
        vrijednostiOgranicenja.append('<label>Dohvati nadobudni raspored <input type="radio" id="nadobudni" name="vrsta" value="dohvatiNadobudniRaspored" checked="checked"/></label>');
    }
}

$(document).ready(function() {
    var dialog, form;

    $('#calendar').fullCalendar({
        theme: false,
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
                selectbox.append('<option value=""></option>');
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

    $('#forma-ogranicenja > div > span > label > input, #forma-ogranicenja > div > span > label > select').each(function(index){
        $(this).val(vrijednostiOstalihKontrola[index]);
    });

    function ispitajIspravnostOgranicenja() {
        var ispravno = true;
        $('#forma-ogranicenja input:not([type="radio"]):not([type="image"])').each(function(){
            var kontrola = $(this);
            if (kontrola.val() === "") {
                ispravno = false;
                kontrola.addClass( "ui-state-highlight" );
                setTimeout(function() {
                    kontrola.removeClass( "ui-state-highlight", 1500 );
                }, 500 );
            }
        });
        if (ispravno) {
            dialog.dialog( "close" );
        }
    }
});
