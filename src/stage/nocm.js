// Colours in this project are exact print values, so three.js must not convert them.
// This module is imported first by anything that creates a colour at load time.
import * as THREE from 'three';

THREE.ColorManagement.enabled = false;
