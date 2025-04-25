// autoMode.js
// This file will contain all logic and classes related to 'auto mode' for the simulation.
// To be imported and referenced by main.js without duplicating logic or affecting other modes.

// Exported API will be defined as the feature is implemented.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';

/**
 * IMU class tracks local position and heading of the mobile device, and manages a travel vector arrow.
 * Heading 0° is +X ("forward"). Arrow is purple, updates with heading. Origin resets on enable/reset.
 */
export class IMU {
  constructor(scene, mobile) {
    // scene: THREE.Scene, mobile: THREE.Mesh (or Object3D)
    this.scene = scene;
    this.mobile = mobile;
    this.origin = mobile.position.clone();
    this.position = new THREE.Vector3(0, 0, 0); // Local position (relative to origin)
    this.heading = 0; // Degrees, 0 = +X
    this.arrow = null;
    this._createArrow();
  }

  _createArrow() {
    if (this.arrow) {
      this.scene.remove(this.arrow);
    }
    // Arrow: purple, length 1, direction = heading
    const dir = new THREE.Vector3(1, 0, 0); // +X is "forward"
    const color = 0xA020F0; // Purple
    this.arrow = new THREE.ArrowHelper(dir, this.mobile.position, 1, color, 0.18, 0.12);
    this.scene.add(this.arrow);
  }

  reset() {
    this.origin.copy(this.mobile.position);
    this.position.set(0, 0, 0);
    this.heading = 0;
    this.updateArrow();
  }

  /**
   * Update IMU state from current mobile position and heading (in radians)
   * @param {number} headingRad - Heading in radians (0 = +X, CCW)
   */
  update(headingRad = null) {
    // Update local position
    this.position.copy(this.mobile.position).sub(this.origin);
    // Optionally update heading
    if (headingRad !== null) {
      this.heading = headingRad * 180 / Math.PI;
    }
    this.updateArrow();
  }

  /**
   * Update the travel vector arrow direction from current heading
   */
  updateArrow() {
    if (!this.arrow) return;
    // Heading in degrees, 0 = +X, CCW in XZ plane
    const rad = this.heading * Math.PI / 180;
    // Forward vector in XZ plane
    const dir = new THREE.Vector3(Math.cos(rad), 0, Math.sin(rad));
    this.arrow.setDirection(dir.normalize());
    this.arrow.position.copy(this.mobile.position);
  }

  /**
   * Get the IMU-reported local position (relative to last reset)
   */
  getLocalPosition() {
    return this.position.clone();
  }

  /**
   * Get the current heading in degrees (0 = +X)
   */
  getHeading() {
    return this.heading;
  }
}

export function enableAutoMode(options) {
  // Placeholder for enabling auto mode
  // options: { path, speed, interval, ... }
}

export function disableAutoMode() {
  // Placeholder for disabling auto mode
}

export function isAutoModeActive() {
  // Placeholder for status
  return false;
}
