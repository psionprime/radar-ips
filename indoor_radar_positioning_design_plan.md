# Indoor Radar-based Positioning System Design Plan

## 1. Requirements & Specs
- 3D accuracy ≤ 10 mm  
- Update rate ≥ 50–100 Hz  
- Indoor range up to ~20 m  
- Static anchors, known 3D positions  
- Mobile receiver + tri-axis IMU (accel + gyro)  
- Latency < 10 ms end-to-end  
- Operate in multipath/NLOS environments  

## 2. System Architecture
```
┌─────────┐      Ethernet/PTP     ┌─────────┐
│ Anchor1 │<────────────────────>│ Anchor2 │ …
└─────────┘                      └─────────┘
     ↑
  FMCW chirps
     ↓
┌──────────────────────────┐
│    Mobile Device         │
│ ┌───────┐  ┌───────────┐ │
│ │Radar  │→│Signal Proc │→ Position + IMU-fusion
│ │Rx Ant │  └───────────┘ │
│ └───────┘  ┌───────────┐ │
│            │  IMU      │ │
│            └───────────┘ │
└──────────────────────────┘
```

## 3. Hardware Components
**Anchors (×4–6)**
- mmWave FMCW transceiver (e.g. 60–67 GHz, B≥4 GHz)
- High-stability clock + IEEE1588/PTP sync
- Omnidirectional patch antenna
- Network interface

**Mobile Receiver**
- Rx front-end + ADC
- 4–8-element Rx array (for optional AoA)
- MCU/FPGA for real-time FFT & DSP
- IMU (100–1 kHz accel+gyro)
- Wireless link for config/logging

## 4. Waveform & Synchronization
- **FMCW chirp**: B ≈ 4–7 GHz → coarse ΔR≈2–4 cm
- **Phase-tracking** across chirps → fine ΔR < 1 cm
- TDMA or PN-orthogonal chirp IDs so mobile can separate anchors
- Anchors sync to ≤1 ns (PTP) → ToF accuracy ~0.3 mm

## 5. Signal Processing Pipeline
1. **RF Rx → ADC**
2. **Beat-freq FFT** (per chirp) → coarse range peaks
3. **Phase-unwrap** beat tone over multiple chirps for fine range
4. **(Optional) AoA** via MUSIC/ESPRIT on Rx array
5. **Peak association** → one range (±phase) per anchor

## 6. Localization Algorithm
- Solve 3D trilateration from ≥4 ranges
- If AoA available, fuse bearing constraints
- Use weighted least-squares

## 7. IMU Fusion
- EKF or UKF state = [pos, vel, orientation, IMU biases]
- **Predict**: IMU at 200–1 kHz
- **Update**: radar fix at 50–100 Hz
- Constrains drift and fills between radar updates

## 8. Calibration & Survey
- **Anchor positions**: survey to <1 mm (laser tracker/VICON)
- **Clock offsets** & antenna delays: offline calibration routine
- **IMU biases**: static/dynamic calibration

## 9. Implementation Roadmap
| Phase             | Weeks | Deliverables                       |
|-------------------|-------|------------------------------------|
| 1. Simulation     | 1–4   | MATLAB/Python radar+EKF models     |
| 2. HW Prototype   | 5–12  | 1–2 anchors + mobile board         |
| 3. DSP & Algo     | 9–16  | FFT, phase-tracking, trilateration |
| 4. Integration    | 15–20 | EKF + full data fusion on device   |
| 5. Validation     | 20–24 | 10 mm tests vs. ground truth       |

## 10. Testing & Metrics
- **Testbed**: 5×5 m room with controllable reflectors
- **Ground truth**: motion capture or laser tracker
- **KPIs**: RMS error, latency, update rate, robustness (NLOS)

## 11. Risks & Mitigation
- **Multipath** → direct-path gating, ML classifier
- **Clock jitter** → ovenized/reference clock
- **Interference** → dynamic channel selection, notch filters

## 12. Compliance & Safety
- FCC Part 15 (for 60 GHz)
- TX power ≤ regulatory limits
- EMI/EMC testing

## 13. Module-specific Accuracy Estimates

| Module                           | Bandwidth (GHz) | Theoretical Range Resolution (cm) | SNR-based Range Accuracy (cm, σ) | Phase-based Resolution (mm) | Practical 2D Error (mm) |
|----------------------------------|-----------------|-----------------------------------|----------------------------------|-----------------------------|-------------------------|
| Waveshare 60 GHz mmWave Radar    | 4.0             | 3.75                              | ±1.0                             | ~0.5                        | ~7                      |
| Seeed 60 GHz mmWave Radar HAT    | 3.0             | 5.0                               | ±2.0                             | ~1.0                        | ~14                     |

*Note: σ is one‐sigma range error; 2D error ≈ √2·σ.*

*This plan balances coarse ToF, fine phase ranging, optional AoA and tight time-sync, all fused with IMU data to reach sub-centimeter indoor tracking.*
