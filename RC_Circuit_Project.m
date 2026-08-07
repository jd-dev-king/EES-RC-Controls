classdef RC_Circuit_Project < handle
    % RC_Circuit_Project
    % Interactive RC Circuit Transient Response Simulator.

    properties (Access = public)
        UIFigure matlab.ui.Figure
        MainGridLayout matlab.ui.container.GridLayout
        InputPanel matlab.ui.container.Panel
        InputGridLayout matlab.ui.container.GridLayout
        PlotPanel matlab.ui.container.Panel
        PlotGridLayout matlab.ui.container.GridLayout

        ResistanceEditField matlab.ui.control.NumericEditField
        CapacitanceEditField matlab.ui.control.NumericEditField
        VoltageEditField matlab.ui.control.NumericEditField
        SimulationTimeEditField matlab.ui.control.NumericEditField
        TimeStepEditField matlab.ui.control.NumericEditField

        RunSimulationButton matlab.ui.control.Button
        ExportCSVButton matlab.ui.control.Button
        SavePlotButton matlab.ui.control.Button
        ClearPlotButton matlab.ui.control.Button
        ResetInputsButton matlab.ui.control.Button
        AboutButton matlab.ui.control.Button

        TimeConstantValueLabel matlab.ui.control.Label
        VoltageTauValueLabel matlab.ui.control.Label
        PeakVoltageValueLabel matlab.ui.control.Label
        SimulationPointsValueLabel matlab.ui.control.Label
        StatusValueLabel matlab.ui.control.Label
        FormulaLabel matlab.ui.control.Label

        UIAxes matlab.ui.control.UIAxes
    end

    properties (Access = private)
        SimulationData table = table()
        CurrentTau double = NaN
        CurrentVoltageTau double = NaN
        CurrentVoltage double = NaN
    end

    methods (Access = public)
        function app = RC_Circuit_Project
            app.createComponents();
            app.configureDefaultValues();
            app.configureAxes();
            app.UIFigure.Visible = 'on';
        end

        function delete(app)
            if ~isempty(app.UIFigure) && isvalid(app.UIFigure)
                delete(app.UIFigure);
            end
        end
    end

    methods (Access = private)
        function createComponents(app)
            app.UIFigure = uifigure( ...
                'Visible', 'off', ...
                'Name', 'RC Circuit Transient Response Simulator', ...
                'Position', [100 100 1220 720], ...
                'Color', [0.95 0.96 0.97]);

            app.UIFigure.CloseRequestFcn = ...
                @(source, event) app.closeApplication();

            app.MainGridLayout = uigridlayout(app.UIFigure, [1 2]);
            app.MainGridLayout.ColumnWidth = {330, '1x'};
            app.MainGridLayout.RowHeight = {'1x'};
            app.MainGridLayout.ColumnSpacing = 12;
            app.MainGridLayout.Padding = [12 12 12 12];

            app.InputPanel = uipanel(app.MainGridLayout);
            app.InputPanel.Title = 'Input Parameters and Controls';
            app.InputPanel.FontWeight = 'bold';
            app.InputPanel.FontSize = 14;
            app.InputPanel.BackgroundColor = [0.97 0.98 0.99];
            app.InputPanel.Layout.Row = 1;
            app.InputPanel.Layout.Column = 1;

            app.InputGridLayout = uigridlayout(app.InputPanel, [21 2]);
            app.InputGridLayout.ColumnWidth = {'1x', 120};
            app.InputGridLayout.RowHeight = { ...
                26, 32, 32, 32, 32, 32, 10, 42, 36, 36, 36, ...
                10, 26, 30, 30, 30, 30, 30, 10, 96, '1x'};
            app.InputGridLayout.ColumnSpacing = 10;
            app.InputGridLayout.RowSpacing = 7;
            app.InputGridLayout.Padding = [14 14 14 14];

            inputHeading = uilabel(app.InputGridLayout);
            inputHeading.Text = 'Circuit Parameters';
            inputHeading.FontWeight = 'bold';
            inputHeading.FontSize = 13;
            inputHeading.FontColor = [0.08 0.25 0.45];
            inputHeading.Layout.Row = 1;
            inputHeading.Layout.Column = [1 2];

            resistanceLabel = uilabel(app.InputGridLayout);
            resistanceLabel.Text = 'Resistance, R (Ohms)';
            resistanceLabel.Layout.Row = 2;
            resistanceLabel.Layout.Column = 1;

            app.ResistanceEditField = uieditfield(app.InputGridLayout, 'numeric');
            app.ResistanceEditField.Limits = [eps Inf];
            app.ResistanceEditField.ValueDisplayFormat = '%.6g';
            app.ResistanceEditField.HorizontalAlignment = 'right';
            app.ResistanceEditField.Layout.Row = 2;
            app.ResistanceEditField.Layout.Column = 2;

            capacitanceLabel = uilabel(app.InputGridLayout);
            capacitanceLabel.Text = 'Capacitance, C (uF)';
            capacitanceLabel.Layout.Row = 3;
            capacitanceLabel.Layout.Column = 1;

            app.CapacitanceEditField = uieditfield(app.InputGridLayout, 'numeric');
            app.CapacitanceEditField.Limits = [eps Inf];
            app.CapacitanceEditField.ValueDisplayFormat = '%.6g';
            app.CapacitanceEditField.HorizontalAlignment = 'right';
            app.CapacitanceEditField.Layout.Row = 3;
            app.CapacitanceEditField.Layout.Column = 2;

            voltageLabel = uilabel(app.InputGridLayout);
            voltageLabel.Text = 'Input Voltage, V0 (V)';
            voltageLabel.Layout.Row = 4;
            voltageLabel.Layout.Column = 1;

            app.VoltageEditField = uieditfield(app.InputGridLayout, 'numeric');
            app.VoltageEditField.Limits = [eps Inf];
            app.VoltageEditField.ValueDisplayFormat = '%.6g';
            app.VoltageEditField.HorizontalAlignment = 'right';
            app.VoltageEditField.Layout.Row = 4;
            app.VoltageEditField.Layout.Column = 2;

            simulationTimeLabel = uilabel(app.InputGridLayout);
            simulationTimeLabel.Text = 'Simulation Time (s)';
            simulationTimeLabel.Layout.Row = 5;
            simulationTimeLabel.Layout.Column = 1;

            app.SimulationTimeEditField = uieditfield(app.InputGridLayout, 'numeric');
            app.SimulationTimeEditField.Limits = [eps Inf];
            app.SimulationTimeEditField.ValueDisplayFormat = '%.8g';
            app.SimulationTimeEditField.HorizontalAlignment = 'right';
            app.SimulationTimeEditField.Layout.Row = 5;
            app.SimulationTimeEditField.Layout.Column = 2;

            timeStepLabel = uilabel(app.InputGridLayout);
            timeStepLabel.Text = 'Time Step (s)';
            timeStepLabel.Layout.Row = 6;
            timeStepLabel.Layout.Column = 1;

            app.TimeStepEditField = uieditfield(app.InputGridLayout, 'numeric');
            app.TimeStepEditField.Limits = [eps Inf];
            app.TimeStepEditField.ValueDisplayFormat = '%.10g';
            app.TimeStepEditField.HorizontalAlignment = 'right';
            app.TimeStepEditField.Layout.Row = 6;
            app.TimeStepEditField.Layout.Column = 2;

            app.RunSimulationButton = uibutton(app.InputGridLayout, 'push');
            app.RunSimulationButton.Text = 'Run Simulation';
            app.RunSimulationButton.FontWeight = 'bold';
            app.RunSimulationButton.FontSize = 13;
            app.RunSimulationButton.FontColor = [1 1 1];
            app.RunSimulationButton.BackgroundColor = [0.05 0.35 0.82];
            app.RunSimulationButton.ButtonPushedFcn = ...
                @(source, event) app.runSimulation();
            app.RunSimulationButton.Layout.Row = 8;
            app.RunSimulationButton.Layout.Column = [1 2];

            app.ExportCSVButton = uibutton(app.InputGridLayout, 'push');
            app.ExportCSVButton.Text = 'Export CSV';
            app.ExportCSVButton.Enable = 'off';
            app.ExportCSVButton.ButtonPushedFcn = ...
                @(source, event) app.exportCSV();
            app.ExportCSVButton.Layout.Row = 9;
            app.ExportCSVButton.Layout.Column = 1;

            app.SavePlotButton = uibutton(app.InputGridLayout, 'push');
            app.SavePlotButton.Text = 'Save Plot';
            app.SavePlotButton.Enable = 'off';
            app.SavePlotButton.ButtonPushedFcn = ...
                @(source, event) app.savePlot();
            app.SavePlotButton.Layout.Row = 9;
            app.SavePlotButton.Layout.Column = 2;

            app.ClearPlotButton = uibutton(app.InputGridLayout, 'push');
            app.ClearPlotButton.Text = 'Clear Plot';
            app.ClearPlotButton.ButtonPushedFcn = ...
                @(source, event) app.clearPlot();
            app.ClearPlotButton.Layout.Row = 10;
            app.ClearPlotButton.Layout.Column = 1;

            app.ResetInputsButton = uibutton(app.InputGridLayout, 'push');
            app.ResetInputsButton.Text = 'Reset Inputs';
            app.ResetInputsButton.ButtonPushedFcn = ...
                @(source, event) app.resetInputs();
            app.ResetInputsButton.Layout.Row = 10;
            app.ResetInputsButton.Layout.Column = 2;

            app.AboutButton = uibutton(app.InputGridLayout, 'push');
            app.AboutButton.Text = 'About This Project';
            app.AboutButton.ButtonPushedFcn = ...
                @(source, event) app.showAboutDialog();
            app.AboutButton.Layout.Row = 11;
            app.AboutButton.Layout.Column = [1 2];

            resultsHeading = uilabel(app.InputGridLayout);
            resultsHeading.Text = 'Calculated Results';
            resultsHeading.FontWeight = 'bold';
            resultsHeading.FontSize = 13;
            resultsHeading.FontColor = [0.08 0.25 0.45];
            resultsHeading.Layout.Row = 13;
            resultsHeading.Layout.Column = [1 2];

            tauHeading = uilabel(app.InputGridLayout);
            tauHeading.Text = 'Time Constant:';
            tauHeading.FontWeight = 'bold';
            tauHeading.Layout.Row = 14;
            tauHeading.Layout.Column = 1;

            app.TimeConstantValueLabel = uilabel(app.InputGridLayout);
            app.TimeConstantValueLabel.Text = 'Not calculated';
            app.TimeConstantValueLabel.HorizontalAlignment = 'right';
            app.TimeConstantValueLabel.FontColor = [0.05 0.35 0.75];
            app.TimeConstantValueLabel.Layout.Row = 14;
            app.TimeConstantValueLabel.Layout.Column = 2;

            voltageTauHeading = uilabel(app.InputGridLayout);
            voltageTauHeading.Text = 'Voltage at tau:';
            voltageTauHeading.FontWeight = 'bold';
            voltageTauHeading.Layout.Row = 15;
            voltageTauHeading.Layout.Column = 1;

            app.VoltageTauValueLabel = uilabel(app.InputGridLayout);
            app.VoltageTauValueLabel.Text = 'Not calculated';
            app.VoltageTauValueLabel.HorizontalAlignment = 'right';
            app.VoltageTauValueLabel.FontColor = [0.10 0.50 0.25];
            app.VoltageTauValueLabel.Layout.Row = 15;
            app.VoltageTauValueLabel.Layout.Column = 2;

            peakVoltageHeading = uilabel(app.InputGridLayout);
            peakVoltageHeading.Text = 'Peak Voltage:';
            peakVoltageHeading.FontWeight = 'bold';
            peakVoltageHeading.Layout.Row = 16;
            peakVoltageHeading.Layout.Column = 1;

            app.PeakVoltageValueLabel = uilabel(app.InputGridLayout);
            app.PeakVoltageValueLabel.Text = 'Not calculated';
            app.PeakVoltageValueLabel.HorizontalAlignment = 'right';
            app.PeakVoltageValueLabel.Layout.Row = 16;
            app.PeakVoltageValueLabel.Layout.Column = 2;

            pointsHeading = uilabel(app.InputGridLayout);
            pointsHeading.Text = 'Simulation Points:';
            pointsHeading.FontWeight = 'bold';
            pointsHeading.Layout.Row = 17;
            pointsHeading.Layout.Column = 1;

            app.SimulationPointsValueLabel = uilabel(app.InputGridLayout);
            app.SimulationPointsValueLabel.Text = '0';
            app.SimulationPointsValueLabel.HorizontalAlignment = 'right';
            app.SimulationPointsValueLabel.Layout.Row = 17;
            app.SimulationPointsValueLabel.Layout.Column = 2;

            statusHeading = uilabel(app.InputGridLayout);
            statusHeading.Text = 'Status:';
            statusHeading.FontWeight = 'bold';
            statusHeading.Layout.Row = 18;
            statusHeading.Layout.Column = 1;

            app.StatusValueLabel = uilabel(app.InputGridLayout);
            app.StatusValueLabel.Text = 'Ready';
            app.StatusValueLabel.HorizontalAlignment = 'right';
            app.StatusValueLabel.FontWeight = 'bold';
            app.StatusValueLabel.FontColor = [0.30 0.35 0.40];
            app.StatusValueLabel.Layout.Row = 18;
            app.StatusValueLabel.Layout.Column = 2;

            app.FormulaLabel = uilabel(app.InputGridLayout);
            app.FormulaLabel.Text = { ...
                'Formula Reference'; ...
                'Charging: V_C(t) = V0(1 - e^{-t/RC})'; ...
                'Discharging: V_C(t) = V0e^{-t/RC}'; ...
                'Time Constant: tau = RC'; ...
                'At t = tau, V_C is about 63.2% of V0'};
            app.FormulaLabel.FontSize = 10;
            app.FormulaLabel.FontColor = [0.32 0.37 0.42];
            app.FormulaLabel.HorizontalAlignment = 'center';
            app.FormulaLabel.VerticalAlignment = 'center';
            app.FormulaLabel.WordWrap = 'on';
            app.FormulaLabel.Layout.Row = 20;
            app.FormulaLabel.Layout.Column = [1 2];

            app.PlotPanel = uipanel(app.MainGridLayout);
            app.PlotPanel.Title = ...
                'RC Circuit Charging and Discharging Response';
            app.PlotPanel.FontWeight = 'bold';
            app.PlotPanel.FontSize = 14;
            app.PlotPanel.BackgroundColor = [1 1 1];
            app.PlotPanel.Layout.Row = 1;
            app.PlotPanel.Layout.Column = 2;

            app.PlotGridLayout = uigridlayout(app.PlotPanel, [1 1]);
            app.PlotGridLayout.RowHeight = {'1x'};
            app.PlotGridLayout.ColumnWidth = {'1x'};
            app.PlotGridLayout.Padding = [10 10 10 10];

            app.UIAxes = uiaxes(app.PlotGridLayout);
            app.UIAxes.Layout.Row = 1;
            app.UIAxes.Layout.Column = 1;
        end

        function configureDefaultValues(app)
            app.ResistanceEditField.Value = 1000;
            app.CapacitanceEditField.Value = 10;
            app.VoltageEditField.Value = 5;
            app.SimulationTimeEditField.Value = 0.1;
            app.TimeStepEditField.Value = 0.0001;

            app.SimulationData = table();
            app.CurrentTau = NaN;
            app.CurrentVoltageTau = NaN;
            app.CurrentVoltage = NaN;

            app.TimeConstantValueLabel.Text = 'Not calculated';
            app.VoltageTauValueLabel.Text = 'Not calculated';
            app.PeakVoltageValueLabel.Text = 'Not calculated';
            app.SimulationPointsValueLabel.Text = '0';
            app.StatusValueLabel.Text = 'Ready';
            app.StatusValueLabel.FontColor = [0.30 0.35 0.40];

            app.ExportCSVButton.Enable = 'off';
            app.SavePlotButton.Enable = 'off';
        end

        function configureAxes(app)
            cla(app.UIAxes);
            title(app.UIAxes, 'RC Circuit Transient Response');
            xlabel(app.UIAxes, 'Time (s)');
            ylabel(app.UIAxes, 'Capacitor Voltage, V_C (V)');
            grid(app.UIAxes, 'on');
            box(app.UIAxes, 'on');

            app.UIAxes.FontSize = 11;
            app.UIAxes.LineWidth = 1;
            app.UIAxes.GridAlpha = 0.22;
            app.UIAxes.MinorGridAlpha = 0.10;
            app.UIAxes.Color = [1 1 1];
            app.UIAxes.XLim = [0 0.1];
            app.UIAxes.YLim = [0 5.5];
        end

        function runSimulation(app)
            app.StatusValueLabel.Text = 'Calculating...';
            app.StatusValueLabel.FontColor = [0.85 0.45 0.05];
            drawnow;

            try
                R = app.ResistanceEditField.Value;
                capacitanceMicrofarads = app.CapacitanceEditField.Value;
                V0 = app.VoltageEditField.Value;
                simulationTime = app.SimulationTimeEditField.Value;
                timeStep = app.TimeStepEditField.Value;

                validateattributes(R, {'numeric'}, ...
                    {'scalar', 'real', 'finite', 'positive'});
                validateattributes(capacitanceMicrofarads, {'numeric'}, ...
                    {'scalar', 'real', 'finite', 'positive'});
                validateattributes(V0, {'numeric'}, ...
                    {'scalar', 'real', 'finite', 'positive'});
                validateattributes(simulationTime, {'numeric'}, ...
                    {'scalar', 'real', 'finite', 'positive'});
                validateattributes(timeStep, {'numeric'}, ...
                    {'scalar', 'real', 'finite', 'positive'});

                if timeStep >= simulationTime
                    error('The time step must be smaller than the simulation time.');
                end

                C = capacitanceMicrofarads * 1e-6;
                tau = R * C;
                t = 0:timeStep:simulationTime;

                if numel(t) > 1000000
                    error(['The selected time step creates too many points. ' ...
                           'Increase the time step.']);
                end

                VcCharge = V0 .* (1 - exp(-t ./ tau));
                VcDischarge = V0 .* exp(-t ./ tau);
                voltageAtTau = V0 * (1 - exp(-1));

                cla(app.UIAxes);

                chargingLine = plot(app.UIAxes, t, VcCharge, '-', ...
                    'Color', [0.05 0.30 0.95], 'LineWidth', 2.3);
                hold(app.UIAxes, 'on');

                dischargingLine = plot(app.UIAxes, t, VcDischarge, '--', ...
                    'Color', [0.90 0.15 0.15], 'LineWidth', 2.1);

                tauLine = xline(app.UIAxes, tau, '--', 'tau', ...
                    'Color', [0.10 0.65 0.25], 'LineWidth', 1.5);

                voltageLine = yline(app.UIAxes, voltageAtTau, '--', ...
                    '63.2% of V0', 'Color', [0.10 0.65 0.25], ...
                    'LineWidth', 1.5);

                if tau <= simulationTime
                    tauMarker = plot(app.UIAxes, tau, voltageAtTau, 'o', ...
                        'Color', [0.05 0.50 0.15], ...
                        'MarkerFaceColor', [0.20 0.80 0.30], ...
                        'MarkerSize', 8);
                else
                    tauMarker = plot(app.UIAxes, NaN, NaN, 'o', ...
                        'Color', [0.05 0.50 0.15], ...
                        'MarkerFaceColor', [0.20 0.80 0.30], ...
                        'MarkerSize', 8);
                end

                title(app.UIAxes, 'RC Circuit Transient Response');
                subtitle(app.UIAxes, sprintf( ...
                    ['R = %.6g Ohms | C = %.6g uF | ' ...
                     'V0 = %.6g V | tau = %.6g s'], ...
                    R, capacitanceMicrofarads, V0, tau));
                xlabel(app.UIAxes, 'Time (s)');
                ylabel(app.UIAxes, 'Capacitor Voltage, V_C (V)');

                legend(app.UIAxes, ...
                    [chargingLine, dischargingLine, tauLine, ...
                     voltageLine, tauMarker], ...
                    {'Charging', 'Discharging', 'Time Constant, tau', ...
                     '63.2% Voltage', 'V_C(tau)'}, ...
                    'Location', 'best');

                grid(app.UIAxes, 'on');
                box(app.UIAxes, 'on');
                app.UIAxes.XMinorGrid = 'on';
                app.UIAxes.YMinorGrid = 'on';
                xlim(app.UIAxes, [0 simulationTime]);
                ylim(app.UIAxes, [0 max([V0, VcCharge, VcDischarge]) * 1.10]);
                hold(app.UIAxes, 'off');

                app.SimulationData = table( ...
                    t', VcCharge', VcDischarge', ...
                    repmat(tau, numel(t), 1), ...
                    'VariableNames', ...
                    {'Time_seconds', 'Charging_Voltage', ...
                     'Discharging_Voltage', 'Time_Constant_seconds'});

                app.CurrentTau = tau;
                app.CurrentVoltageTau = voltageAtTau;
                app.CurrentVoltage = V0;

                app.TimeConstantValueLabel.Text = sprintf('%.6f s', tau);
                app.VoltageTauValueLabel.Text = sprintf('%.4f V', voltageAtTau);
                app.PeakVoltageValueLabel.Text = sprintf('%.4f V', V0);
                app.SimulationPointsValueLabel.Text = sprintf('%d', numel(t));
                app.StatusValueLabel.Text = 'Simulation complete';
                app.StatusValueLabel.FontColor = [0.05 0.55 0.20];

                app.ExportCSVButton.Enable = 'on';
                app.SavePlotButton.Enable = 'on';

            catch ME
                app.StatusValueLabel.Text = 'Simulation error';
                app.StatusValueLabel.FontColor = [0.80 0.10 0.10];
                uialert(app.UIFigure, ME.message, ...
                    'Simulation Error', 'Icon', 'error');
            end
        end

        function exportCSV(app)
            if isempty(app.SimulationData) || height(app.SimulationData) == 0
                uialert(app.UIFigure, ...
                    'Run a simulation before exporting data.', ...
                    'No Simulation Data', 'Icon', 'warning');
                return;
            end

            [fileName, folderPath] = uiputfile( ...
                {'*.csv', 'CSV Files (*.csv)'}, ...
                'Export RC Circuit Simulation Data', ...
                'RC_Transient_Response_Data.csv');

            if isequal(fileName, 0) || isequal(folderPath, 0)
                return;
            end

            try
                fullFilePath = fullfile(folderPath, fileName);
                writetable(app.SimulationData, fullFilePath);
                app.StatusValueLabel.Text = 'CSV exported';
                app.StatusValueLabel.FontColor = [0.05 0.55 0.20];
                uialert(app.UIFigure, ...
                    sprintf('Simulation data exported successfully.\n\n%s', ...
                    fullFilePath), ...
                    'Export Complete', 'Icon', 'success');
            catch ME
                uialert(app.UIFigure, ME.message, ...
                    'Export Error', 'Icon', 'error');
            end
        end

        function savePlot(app)
            if isempty(app.SimulationData) || height(app.SimulationData) == 0
                uialert(app.UIFigure, ...
                    'Run a simulation before saving the plot.', ...
                    'No Plot Available', 'Icon', 'warning');
                return;
            end

            [fileName, folderPath] = uiputfile( ...
                {'*.png', 'PNG Image (*.png)'; ...
                 '*.jpg', 'JPEG Image (*.jpg)'; ...
                 '*.pdf', 'PDF Document (*.pdf)'}, ...
                'Save RC Circuit Plot', ...
                'RC_Circuit_Transient_Response.png');

            if isequal(fileName, 0) || isequal(folderPath, 0)
                return;
            end

            try
                fullFilePath = fullfile(folderPath, fileName);
                exportgraphics(app.UIAxes, fullFilePath, ...
                    'Resolution', 300);
                app.StatusValueLabel.Text = 'Plot saved';
                app.StatusValueLabel.FontColor = [0.05 0.55 0.20];
                uialert(app.UIFigure, ...
                    sprintf('The plot was saved successfully.\n\n%s', ...
                    fullFilePath), ...
                    'Plot Saved', 'Icon', 'success');
            catch ME
                uialert(app.UIFigure, ME.message, ...
                    'Save Plot Error', 'Icon', 'error');
            end
        end

        function clearPlot(app)
            app.configureAxes();
            app.SimulationData = table();
            app.CurrentTau = NaN;
            app.CurrentVoltageTau = NaN;
            app.CurrentVoltage = NaN;
            app.TimeConstantValueLabel.Text = 'Not calculated';
            app.VoltageTauValueLabel.Text = 'Not calculated';
            app.PeakVoltageValueLabel.Text = 'Not calculated';
            app.SimulationPointsValueLabel.Text = '0';
            app.StatusValueLabel.Text = 'Plot cleared';
            app.StatusValueLabel.FontColor = [0.30 0.35 0.40];
            app.ExportCSVButton.Enable = 'off';
            app.SavePlotButton.Enable = 'off';
        end

        function resetInputs(app)
            app.configureDefaultValues();
            app.configureAxes();
            app.StatusValueLabel.Text = 'Inputs reset';
            app.StatusValueLabel.FontColor = [0.05 0.35 0.75];
        end

        function showAboutDialog(app)
            aboutMessage = sprintf([ ...
                'RC Circuit Transient Response Simulator\n\n' ...
                'Version 1.0\n\n' ...
                'Developed by Jeremiah Lupton\n' ...
                'Engineering Technology Portfolio\n\n' ...
                'Features:\n' ...
                '- Charging and discharging simulation\n' ...
                '- Time constant calculation\n' ...
                '- Voltage-at-tau calculation\n' ...
                '- CSV data export\n' ...
                '- Plot image and PDF export']);

            uialert(app.UIFigure, aboutMessage, ...
                'About RC Circuit Simulator', 'Icon', 'info');
        end

        function closeApplication(app)
            selection = uiconfirm(app.UIFigure, ...
                'Are you sure you want to close the simulator?', ...
                'Close Application', ...
                'Options', {'Close', 'Cancel'}, ...
                'DefaultOption', 'Cancel', ...
                'CancelOption', 'Cancel');

            if strcmp(selection, 'Close')
                delete(app.UIFigure);
            end
        end
    end
end
