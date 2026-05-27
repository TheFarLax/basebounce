// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BaseBounce
 * @dev A minimal, premium arcade game score registry for the Base ecosystem.
 */
contract BaseBounce {
    // Mapping from player address to their highest score
    mapping(address => uint256) public bestScore;

    // Emitted when a new high score is successfully recorded
    event ScoreSubmitted(
        address indexed player,
        uint256 score
    );

    /**
     * @notice Submits a new score for the sender.
     * @dev Reverts if the submitted score is not strictly higher than the player's current best score.
     * @param score The score achieved by the player.
     */
    function submitScore(uint256 score) external {
        uint256 currentBest = bestScore[msg.sender];
        require(score > currentBest, "Score must be strictly greater than previous best");
        
        bestScore[msg.sender] = score;
        
        emit ScoreSubmitted(msg.sender, score);
    }
}
