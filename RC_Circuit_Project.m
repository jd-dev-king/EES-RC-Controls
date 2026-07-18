%% RC Circuit Transient Response
% Sample MATLAB Project

clc;
clear;
close all;

%% Circuit Parameters
R = 1000;
C = 0.001;
V0 = 5;

%% Time Constant
tau = R*C;

fprintf('Time Constant = %.3f seconds\n',tau);

%% Time Vector
t = 0:0.01:5*tau;

%% Charging
Vc_charge = V0*(1-exp(-t/(R*C)));

%% Discharging
Vc_discharge = V0*exp(-t/(R*C));

%% Voltage at Tau
Voltage_tau = V0*(1-exp(-1));

%% Plot

figure

plot(t,Vc_charge,'b','LineWidth',2)
hold on

plot(t,Vc_discharge,'r--','LineWidth',2)

plot(tau,Voltage_tau,...
    'ko',...
    'MarkerFaceColor','g',...
    'MarkerSize',8)

grid on

xlabel('Time (seconds)')
ylabel('Voltage (Volts)')
title('RC Circuit Charging and Discharging')
legend('Charging','Discharging','Time Constant')

%% Export Data

Data = table(t',Vc_charge',Vc_discharge',...
    'VariableNames',...
    {'Time','ChargeVoltage','DischargeVoltage'});

writetable(Data,'RC_Data.csv');

disp('Simulation Complete')