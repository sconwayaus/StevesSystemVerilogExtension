# mySystemVerilogExtension
A VS Code extension bundling all the things I want in a System Verilog IDE.

The project draws from multiple projects:
- https://github.com/chipsalliance/verible
- https://github.com/eirikpre/VSCode-SystemVerilog
- https://github.com/mshr-h/vscode-verilog-hdl-support
- https://github.com/TerosTechnology/vscode-terosHDL

## Debug LSP
Set the following environment variables to get more debugging from verible-verilog-ls.exe
VERIBLE_LOGTHRESHOLD=0
VERIBLE_VLOG_DETAIL=1