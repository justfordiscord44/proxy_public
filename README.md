node proxy
=============
# 描述
nodejs 写的http代理, 使没有公网ip的机器也能充当代理服务器.
# 使用
1) 在一台有公网地址的机器上运行server.js

2) 在没有公网地址的机器上运行client.js, client会连接到服务器(修改client文件中的server ip).

3) 将浏览器或者其它程序的http代理设置成server的ip和对应的port即可.


