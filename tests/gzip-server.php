<?php
    $data = "";
    for($i=0;$i<2000;$i++){
        $data .= "$i\n";
    }
    $data = $data . "end";
    $gzdata = gzencode($data, 9);
    $chunk_array = str_split($gzdata, 5);
   
    $socket = stream_socket_server("tcp://127.0.0.1:9999", $errno, $errstr);
    
    while($conn = stream_socket_accept($socket)){
        $x = fread($conn, 102400);
        fwrite($conn, "HTTP/1.1 200 OK\r\n");
        fwrite($conn, "Content-Encoding: gzip\r\n");
        fwrite($conn, "Content-Type: text/html\r\n");
        fwrite($conn, "Transfer-Encoding: chunked\r\n");
        fwrite($conn, "Server: qzhttp\r\n");
        fwrite($conn, "\r\n");
        
        for($i = 0;$i < count($chunk_array);$i++){
            fwrite($conn, dechex(strlen($chunk_array[$i]))."\r\n");
            fwrite($conn, $chunk_array[$i]."\r\n");
        }
        
        fwrite($conn, "0\r\n\r\n");
        fclose($conn);
    }
    fclose($socket);
?>