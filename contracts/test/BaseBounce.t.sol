// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/BaseBounce.sol";

contract BaseBounceTest is Test {
    BaseBounce public baseBounce;
    address public player1 = address(0x1111);
    address public player2 = address(0x2222);

    event ScoreSubmitted(address indexed player, uint256 score);

    function setUp() public {
        baseBounce = new BaseBounce();
    }

    function test_InitialScoreIsZero() public view {
        assertEq(baseBounce.bestScore(player1), 0);
    }

    function test_SubmitScoreSuccess() public {
        vm.startPrank(player1);
        
        // Expect event to be emitted
        vm.expectEmit(true, false, false, true);
        emit ScoreSubmitted(player1, 100);
        
        baseBounce.submitScore(100);
        assertEq(baseBounce.bestScore(player1), 100);
        
        vm.stopPrank();
    }

    function test_SubmitScoreLowerReverts() public {
        vm.startPrank(player1);
        baseBounce.submitScore(100);
        
        // Submitting a lower score should revert
        vm.expectRevert("Score must be strictly greater than previous best");
        baseBounce.submitScore(50);
        
        // Submitting an equal score should revert
        vm.expectRevert("Score must be strictly greater than previous best");
        baseBounce.submitScore(100);
        
        assertEq(baseBounce.bestScore(player1), 100);
        vm.stopPrank();
    }

    function test_IndependentPlayerScores() public {
        // Player 1 submits 100
        vm.prank(player1);
        baseBounce.submitScore(100);

        // Player 2 submits 150
        vm.prank(player2);
        baseBounce.submitScore(150);

        assertEq(baseBounce.bestScore(player1), 100);
        assertEq(baseBounce.bestScore(player2), 150);
    }
}
