using System;
using System.Diagnostics;
using System.IO;

class Program {
    static void Main() {
        // Path to the actual executable in 'bin' folder
        string binPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bin", "Batch Image Editor.exe");
        
        if (File.Exists(binPath)) {
            try {
                ProcessStartInfo startInfo = new ProcessStartInfo(binPath);
                // Important: Set working directory to 'bin' so Electron finds resources
                startInfo.WorkingDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bin");
                Process.Start(startInfo);
            } catch (Exception ex) {
                // Silent failure or log to file if needed
            }
        }
    }
}
