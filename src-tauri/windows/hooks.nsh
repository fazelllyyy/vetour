!macro NSIS_HOOK_POSTINSTALL
  ; Register .vetour file icon
  WriteRegStr HKCR ".vetour" "" "vetourfile"
  WriteRegStr HKCR "vetourfile" "" "Vetour Project"
  WriteRegStr HKCR "vetourfile\DefaultIcon" "" "$INSTDIR\vetour-file.ico"
  WriteRegStr HKCR "vetourfile\shell\open\command" "" '"$INSTDIR\${MAINEXECUTABLE}" "%1"'
  
  ; Refresh shell icons to apply file association icon immediately
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  MessageBox MB_YESNO|MB_ICONQUESTION "Delete all saved projects and app settings?" /SD IDNO IDYES setDelete
  StrCpy $R0 "keep"
  Goto done
  setDelete:
    StrCpy $R0 "delete"
  done:
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Remove .vetour file association
  DeleteRegKey HKCR ".vetour"
  DeleteRegKey HKCR "vetourfile"

  ; Refresh shell icons
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'

  ; Delete user data if user chose yes
  StrCmp $R0 "delete" "" skipData
    RMDir /r "$APPDATA\${APP_HOME}"
    RMDir /r "$LOCALAPPDATA\${APP_HOME}"
  skipData:
!macroend
