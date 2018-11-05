<?php
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use React\ChildProcess\Process;

require __DIR__ . '/vendor/autoload.php';

const PERIOD_SLANJA = 1;
const TRAJANJE_SPAVANJA = 0.2;

    class PosiljateljRasporeda implements MessageComponentInterface {

        private $loop;
        private $dohvatiteljRasporeda;
        private $timer;
        private $client;
        private $prologCommand;
        private $jestWindowsLjuska;
        private $process;
        private $prethodniNedovrseniRaspored;
        private $rasporedi = [];
    
        public function __construct($prologCommand) {
            $this->prologCommand = $prologCommand;
        }

        public function setLoop($loop) {
            $this->loop = $loop;
        }

        public function setShellType($jestWindowsLjuska) {
            $this->jestWindowsLjuska = $jestWindowsLjuska;
        }
    
        public function onOpen(ConnectionInterface $client) {
            $this->client = $client;
            $this->timer = $this->loop->addPeriodicTimer(PERIOD_SLANJA, function() {
                $this->posalji_rezultate_klijentu();
            });
            $lokacijaPrologSkripte = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'pronalazak-rasporeda.pl';
            if ($this->jestWindowsLjuska) {
                $env = null;
            }
            else {
                $env = array(
                    'LANG' => 'hr_HR.utf-8'     // taj locale bi trebao biti prethodno instaliran na sustavu: sudo locale-gen hr_HR; sudo locale-gen hr_HR.UTF-8; sudo update-locale
                );
            }
            $this->process = new Process("swipl -s $lokacijaPrologSkripte", null, $env);
            $this->process->start($this->loop);
            $this->prethodniNedovrseniRaspored = '';
            $this->process->stdout->on('data', function($rezultat) {
                if ($this->jestWindowsLjuska) {
                    $rezultat = iconv('windows-1250', 'utf-8', $rezultat);
                }
                $prevRetVal = 0;
                $offset = 0;
                while (true) {
                    $retVal = strpos($rezultat, "\n", $offset);
                    if ($retVal === false) {
                        $this->prethodniNedovrseniRaspored .= substr($rezultat, $prevRetVal);
                        break;
                    }
                    else {
                        $serijaliziraniRaspored = substr($rezultat, $prevRetVal, $retVal - $prevRetVal);
                        if (!empty($this->prethodniNedovrseniRaspored)) {
                            $serijaliziraniRaspored = $this->prethodniNedovrseniRaspored . $serijaliziraniRaspored;
                            $this->prethodniNedovrseniRaspored = '';
                        }
                        $this->rasporedi[] = json_decode($serijaliziraniRaspored, true);
                        $prevRetVal = $retVal;
                        $offset = $prevRetVal + 1;
                    }
                }
                usleep(1000000*TRAJANJE_SPAVANJA);
            });

            $this->process->stdout->on('end', function() {
                $this->rasporedi[] = false;
                $this->loop->cancelTimer($this->timer);
                $this->posalji_rezultate_klijentu();
            });
            
            $this->process->stdin->write($this->prologCommand . "\n");
            $this->process->stdin->end(null);
        }
    
        public function onMessage(ConnectionInterface $from, $msg) {
        }
    
        public function onClose(ConnectionInterface $conn) {
            $this->loop->cancelTimer($this->timer);
            $this->process->stdout->close();
            $this->process->stderr->close();
            $this->process->terminate();
            exit();
        }
    
        public function onError(ConnectionInterface $conn, \Exception $e) {
            echo "An error has occurred: {$e->getMessage()}\n";
    
            $conn->close();
        }

        private function posalji_rezultate_klijentu() {
            $end = false;
            if (!empty($this->rasporedi)) {
                $lastElem = end($this->rasporedi);
                reset($this->rasporedi);
                $end = $lastElem === false;  // if there are no more results, it should be false
                if ($end) {
                    array_pop($this->rasporedi);
                }
            }
            if (!empty($this->rasporedi)) {
                $this->client->send(dohvati_rasporede_za_ispis($this->rasporedi));
            }
            if ($end) {
                $this->client->close();
            }
            $this->rasporedi = [];
        }
    }

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

    if ($argc === 5) {
        ini_set('memory_limit', -1);
        set_time_limit(0);
        date_default_timezone_set('UTC');
        $jezik = $argv[1];
        $myIpAddress = $argv[2];
        $studij = $argv[3];
        $prologCommand = $argv[4];
                
        $posiljateljRasporeda = new PosiljateljRasporeda($prologCommand);
        while (true) {
            try {
                $server = IoServer::factory(
                    new HttpServer(
                        new WsServer(
                            $posiljateljRasporeda
                        )
                    ),
                    $port = 1024 + rand() % (65535-1024),
                    $myIpAddress
                );
                break;
            }
            catch (Exception $e) {
            }
        }
        echo $port;
        fclose(STDOUT);

        require_once 'dohvat-informacija-predmeta.php';
        require_once 'dohvati-rasporede-za-ispis.php';
        
        $posiljateljRasporeda->setShellType($jestWindowsLjuska);
        $posiljateljRasporeda->setLoop($server->loop);    
        $server->run();
    }
?>
