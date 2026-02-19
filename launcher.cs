using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

class Program {
    [STAThread]
    static void Main() {
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string binPath = Path.Combine(baseDir, "bin", "Batch Image Editor.exe");
        
        if (!File.Exists(binPath)) {
            MessageBox.Show(
                "Executable not found:\n" + binPath + "\n\n" +
                "If the file exists, please try running 'Batch Image Editor.exe' directly from the bin folder.",
                "Launch Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        try {
            ProcessStartInfo startInfo = new ProcessStartInfo(binPath);
            startInfo.WorkingDirectory = Path.Combine(baseDir, "bin");
            Process.Start(startInfo);
        } catch (Exception ex) {
            MessageBox.Show(
                "An error occurred while starting the application:\n" + ex.Message + "\n\n" +
                "Please try running 'Batch Image Editor.exe' directly from the bin folder.",
                "Launch Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
