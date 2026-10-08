Dim fso, scriptDir, projectDir, nodeScript, shell
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectDir = fso.GetParentFolderName(scriptDir)
nodeScript = fso.BuildPath(scriptDir, "keep_supabase_alive.mjs")

Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = projectDir
' 0 = Hide window, True = wait for completion
shell.Run "cmd /c node """ & nodeScript & """", 0, True
