{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.ffmpeg
    pkgs.nodejs
  ];

  shellHook = ''
    export PATH=${pkgs.ffmpeg}/bin:$PATH
  '';
}
